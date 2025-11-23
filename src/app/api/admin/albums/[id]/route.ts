import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdmin } from "@/utils/admin-auth";

/**
 * GET /api/admin/albums/[id]
 * 獲取單一相簿
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證管理員身份
    const auth = await authenticateAdmin(request);

    const { id } = await params;

    // 獲取相簿
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!album) {
      return NextResponse.json({ error: "找不到該相簿" }, { status: 404 });
    }

    // 驗證相簿所有權
    if (album.adminId !== auth.admin.id) {
      return NextResponse.json({ error: "無權訪問此相簿" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: album.id,
        name: album.name,
        description: album.description,
        coverImageHash: album.coverImageHash,
        itemCount: album._count.items,
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
    console.error("獲取相簿失敗:", error);
    return NextResponse.json({ error: "獲取相簿失敗" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/albums/[id]
 * 更新相簿
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證管理員身份
    const auth = await authenticateAdmin(request);

    const { id } = await params;

    // 獲取現有相簿
    const existing = await prisma.album.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "找不到該相簿" }, { status: 404 });
    }

    // 驗證相簿所有權
    if (existing.adminId !== auth.admin.id) {
      return NextResponse.json({ error: "無權修改此相簿" }, { status: 403 });
    }

    // 解析請求體
    const body = await request.json().catch(() => ({}));
    const { name, description, coverImageHash } = body;

    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "相簿名稱不能為空" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description =
        description && typeof description === "string"
          ? description.trim()
          : null;
    }

    if (coverImageHash !== undefined) {
      updateData.coverImageHash =
        coverImageHash && typeof coverImageHash === "string"
          ? coverImageHash.trim()
          : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "沒有可更新的欄位" },
        { status: 400 }
      );
    }

    // 更新相簿
    const updated = await prisma.album.update({
      where: { id },
      data: updateData,
    });

    // 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "UPDATE",
        entity: "album",
        entityId: updated.id,
        details: {
          before: {
            name: existing.name,
            description: existing.description,
            coverImageHash: existing.coverImageHash,
          },
          after: {
            name: updated.name,
            description: updated.description,
            coverImageHash: updated.coverImageHash,
          },
        },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        coverImageHash: updated.coverImageHash,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    // 處理認證錯誤
    if (error.status === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // 其他錯誤
    console.error("更新相簿失敗:", error);
    return NextResponse.json({ error: "更新相簿失敗" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/albums/[id]
 * 刪除相簿
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證管理員身份
    const auth = await authenticateAdmin(request);

    const { id } = await params;

    // 獲取相簿
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!album) {
      return NextResponse.json({ error: "找不到該相簿" }, { status: 404 });
    }

    // 驗證相簿所有權
    if (album.adminId !== auth.admin.id) {
      return NextResponse.json({ error: "無權刪除此相簿" }, { status: 403 });
    }

    // 刪除相簿（會級聯刪除所有 AlbumItem）
    await prisma.album.delete({
      where: { id },
    });

    // 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "DELETE",
        entity: "album",
        entityId: album.id,
        details: {
          name: album.name,
          description: album.description,
          itemCount: album._count.items,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "相簿已刪除",
    });
  } catch (error: any) {
    // 處理認證錯誤
    if (error.status === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // 其他錯誤
    console.error("刪除相簿失敗:", error);
    return NextResponse.json({ error: "刪除相簿失敗" }, { status: 500 });
  }
}
