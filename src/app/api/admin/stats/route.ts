import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/utils/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員身份
    await authenticateAdmin(request);

    // 獲取統計數據
    const [totalMappings, todayUploads, activeMappings] =
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
  } catch (error: any) {
    // 處理認證錯誤
    if (error.status === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // 其他錯誤
    console.error("獲取統計數據失敗:", error);
    return NextResponse.json({ error: "獲取統計數據失敗" }, { status: 500 });
  }
}
