import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";

/**
 * PATCH /api/admin/albums/[id]/items/[itemId]
 * 更新相簿項目（標題、順序等）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
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

    const { id, itemId } = await params;

    // 獲取相簿
    const album = await prisma.album.findUnique({
      where: { id },
    });

    if (!album) {
      return NextResponse.json({ error: "找不到該相簿" }, { status: 404 });
    }

    // 驗證相簿所有權
    if (album.adminId !== auth.admin.id) {
      return NextResponse.json({ error: "無權修改此相簿" }, { status: 403 });
    }

    // 獲取項目
    const item = await prisma.albumItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ error: "找不到該項目" }, { status: 404 });
    }

    // 驗證項目屬於該相簿
    if (item.albumId !== id) {
      return NextResponse.json(
        { error: "該項目不屬於此相簿" },
        { status: 400 }
      );
    }

    // 解析請求體
    const body = await request.json();
    const { note, order } = body;

    // 更新項目
    const updatedItem = await prisma.albumItem.update({
      where: { id: itemId },
      data: {
        ...(note !== undefined && { note: note || null }),
        ...(order !== undefined && { order }),
      },
    });

    // 更新相簿的 updatedAt
    await prisma.album.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    console.error("更新相簿項目失敗:", error);
    return NextResponse.json({ error: "更新相簿項目失敗" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/albums/[id]/items/[itemId]
 * 從相簿移除圖片
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
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

    const { id, itemId } = await params;

    // 獲取相簿
    const album = await prisma.album.findUnique({
      where: { id },
    });

    if (!album) {
      return NextResponse.json({ error: "找不到該相簿" }, { status: 404 });
    }

    // 驗證相簿所有權
    if (album.adminId !== auth.admin.id) {
      return NextResponse.json({ error: "無權修改此相簿" }, { status: 403 });
    }

    // 獲取項目
    const item = await prisma.albumItem.findUnique({
      where: { id: itemId },
      include: {
        mapping: {
          select: {
            filename: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "找不到該項目" }, { status: 404 });
    }

    // 驗證項目屬於該相簿
    if (item.albumId !== id) {
      return NextResponse.json(
        { error: "該項目不屬於此相簿" },
        { status: 400 }
      );
    }

    // 刪除項目
    await prisma.albumItem.delete({
      where: { id: itemId },
    });

    // 更新相簿的 updatedAt
    await prisma.album.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "DELETE",
        entity: "album_item",
        entityId: item.id,
        details: {
          albumId: id,
          albumName: album.name,
          mappingId: item.mappingId,
          filename: item.mapping.filename,
          note: item.note,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "已從相簿移除",
    });
  } catch (error) {
    console.error("移除相簿項目失敗:", error);
    return NextResponse.json({ error: "移除相簿項目失敗" }, { status: 500 });
  }
}
