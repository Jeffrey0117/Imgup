import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";

/**
 * GET /api/admin/albums
 * 獲取所有相簿
 */
export async function GET(request: NextRequest) {
  try {
    // 驗證管理員身份
    let token = extractTokenFromRequest(request);
    if (!token) {
      token = request.cookies.get("admin_token")?.value || null;
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

    const auth = await verifyAdminSession(token);
    if (!auth.valid || !auth.admin) {
      return NextResponse.json({ error: "身份驗證失敗" }, { status: 401 });
    }

    // 獲取所有相簿
    const albums = await prisma.album.findMany({
      where: {
        adminId: auth.admin.id,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const data = albums.map((album) => ({
      id: album.id,
      name: album.name,
      description: album.description,
      coverImageHash: album.coverImageHash,
      itemCount: album._count.items,
      createdAt: album.createdAt.toISOString(),
      updatedAt: album.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("獲取相簿列表失敗:", error);
    return NextResponse.json({ error: "獲取列表失敗" }, { status: 500 });
  }
}

/**
 * POST /api/admin/albums
 * 創建新相簿
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證管理員身份
    let token = extractTokenFromRequest(request);
    if (!token) {
      token = request.cookies.get("admin_token")?.value || null;
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

    const auth = await verifyAdminSession(token);
    if (!auth.valid || !auth.admin) {
      return NextResponse.json({ error: "身份驗證失敗" }, { status: 401 });
    }

    // 解析請求體
    const body = await request.json().catch(() => ({}));
    const { name, description } = body;

    // 驗證必填欄位
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "相簿名稱不能為空" }, { status: 400 });
    }

    // 創建相簿
    const album = await prisma.album.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        adminId: auth.admin.id,
      },
    });

    // 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "CREATE",
        entity: "album",
        entityId: album.id,
        details: {
          name: album.name,
          description: album.description,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: album.id,
        name: album.name,
        description: album.description,
        coverImageHash: album.coverImageHash,
        createdAt: album.createdAt.toISOString(),
        updatedAt: album.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("創建相簿失敗:", error);
    return NextResponse.json({ error: "創建相簿失敗" }, { status: 500 });
  }
}
