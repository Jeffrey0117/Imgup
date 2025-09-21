import { NextRequest, NextResponse } from "next/server";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 從 Authorization header 或 cookies 中提取 token
    let token = extractTokenFromRequest(request);

    // 如果 Authorization header 沒有 token，嘗試從 cookies 中獲取
    if (!token) {
      token = request.cookies.get("admin_token")?.value || null;

      // 如果還是沒有，從 Cookie header 手動解析
      if (!token) {
        const cookieHeader = request.headers.get("cookie");
        if (cookieHeader) {
          const cookies = cookieHeader.split(";").map((c) => c.trim());
          for (const cookie of cookies) {
            if (cookie.startsWith("admin_token=")) {
              token = cookie.split("=")[1];
              break;
            }
          }
        }
      }
    }

    if (!token) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    // 驗證管理員身份
    const authResult = await verifyAdminSession(token);
    if (!authResult.valid) {
      return NextResponse.json({ error: "身份驗證失敗" }, { status: 401 });
    }

    // 獲取統計數據
    const [totalMappings, todayUploads, activeMappings, totalViews] =
      await Promise.all([
        // 總檔案數（未刪除）
        prisma.mapping.count({
          where: { isDeleted: false },
        }),

        // 今日上傳數（未刪除）
        prisma.mapping.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
            isDeleted: false,
          },
        }),

        // 活躍檔案數（未過期且未刪除）
        prisma.mapping.count({
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            isDeleted: false,
          },
        }),

        // 總瀏覽次數
        prisma.mapping.aggregate({
          where: { isDeleted: false },
          _sum: {
            viewCount: true,
          },
        }),
      ]);

    // 獲取最近上傳的檔案
    const recentUploads = await prisma.mapping.findMany({
      where: { isDeleted: false },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        hash: true,
        filename: true,
        url: true,
        shortUrl: true,
        createdAt: true,
        expiresAt: true,
        viewCount: true,
        password: true,
      },
    });

    // 獲取過去7天的上傳統計
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyStats = await prisma.mapping.groupBy({
      by: ["createdAt"],
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        isDeleted: false,
      },
      _count: {
        id: true,
      },
    });

    // 格式化數據
    const stats = {
      totalMappings,
      todayUploads,
      activeMappings,
      totalViews: totalViews._sum.viewCount || 0,
      recentUploads: recentUploads.map((mapping: any) => ({
        ...mapping,
        createdAt: mapping.createdAt.toISOString(),
        expiresAt: mapping.expiresAt?.toISOString() || null,
        isExpired: mapping.expiresAt ? mapping.expiresAt < new Date() : false,
        hasPassword: !!mapping.password,
        // 移除密碼欄位以避免洩露
        password: undefined,
      })),
      weeklyStats: weeklyStats.map((stat: any) => ({
        date: stat.createdAt.toISOString().split("T")[0],
        count: stat._count.id,
      })),
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("獲取統計數據失敗:", error);
    return NextResponse.json({ error: "獲取統計數據失敗" }, { status: 500 });
  }
}
