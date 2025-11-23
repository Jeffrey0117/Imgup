import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdmin } from "@/utils/admin-auth";

/**
 * GET /api/admin/albums
 * 獲取所有相簿
 */
export async function GET(request: NextRequest) {
  try {
    // 驗證管理員身份
    const auth = await authenticateAdmin(request);

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
  } catch (error: any) {
    // 處理認證錯誤
    if (error.status === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // 其他錯誤
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
    const auth = await authenticateAdmin(request);

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
  } catch (error: any) {
    // 處理認證錯誤
    if (error.status === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // 其他錯誤
    console.error("創建相簿失敗:", error);
    return NextResponse.json({ error: "創建相簿失敗" }, { status: 500 });
  }
}
