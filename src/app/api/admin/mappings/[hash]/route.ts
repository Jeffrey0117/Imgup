import { NextRequest, NextResponse } from "next/server";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    // 驗證管理員身份
    let token = extractTokenFromRequest(request);
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

    const authResult = await verifyAdminSession(token);
    if (!authResult.valid) {
      return NextResponse.json({ error: "身份驗證失敗" }, { status: 401 });
    }

    const { hash } = params;

    // 查找檔案記錄
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
    });

    if (!mapping) {
      return NextResponse.json({ error: "找不到該檔案" }, { status: 404 });
    }

    // 軟刪除：標記為已刪除
    await prisma.mapping.update({
      where: { hash },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: authResult.admin?.id,
      },
    });

    // 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: authResult.admin!.id,
        action: "DELETE",
        entity: "mapping",
        entityId: mapping.id,
        details: {
          hash: mapping.hash,
          filename: mapping.filename,
          reason: "管理員刪除",
        },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "檔案已刪除",
    });
  } catch (error) {
    console.error("刪除檔案失敗:", error);
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    // 驗證管理員身份
    let token = extractTokenFromRequest(request);
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

    const authResult = await verifyAdminSession(token);
    if (!authResult.valid) {
      return NextResponse.json({ error: "身份驗證失敗" }, { status: 401 });
    }

    const { hash } = params;

    // 查找檔案記錄
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!mapping) {
      return NextResponse.json({ error: "找不到該檔案" }, { status: 404 });
    }

    const mappingInfo = {
      ...mapping,
      createdAt: mapping.createdAt.toISOString(),
      expiresAt: mapping.expiresAt?.toISOString() || null,
      deletedAt: mapping.deletedAt?.toISOString() || null,
      isExpired: mapping.expiresAt ? mapping.expiresAt < new Date() : false,
      hasPassword: !!mapping.password,
      // 移除密碼以避免洩露
      password: undefined,
      logs: mapping.logs.map((log: any) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
    };

    return NextResponse.json({
      success: true,
      data: mappingInfo,
    });
  } catch (error) {
    console.error("獲取檔案詳情失敗:", error);
    return NextResponse.json({ error: "獲取詳情失敗" }, { status: 500 });
  }
}
