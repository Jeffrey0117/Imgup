import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";

/**
 * POST /api/admin/favorites/toggle
 * 快速收藏/取消收藏（到「未分類」相簿）
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
    const { mappingId } = body;

    // 驗證必填欄位
    if (!mappingId || typeof mappingId !== "string") {
      return NextResponse.json({ error: "缺少圖片 ID" }, { status: 400 });
    }

    // 驗證圖片是否存在
    const mapping = await prisma.mapping.findUnique({
      where: { id: mappingId },
    });

    if (!mapping) {
      return NextResponse.json({ error: "找不到該圖片" }, { status: 404 });
    }

    // 查找或創建「未分類」相簿
    let defaultAlbum = await prisma.album.findFirst({
      where: {
        adminId: auth.admin.id,
        name: "未分類",
      },
    });

    if (!defaultAlbum) {
      defaultAlbum = await prisma.album.create({
        data: {
          name: "未分類",
          description: "預設相簿",
          adminId: auth.admin.id,
        },
      });
    }

    // 檢查是否已經在「未分類」相簿中
    const existingItem = await prisma.albumItem.findUnique({
      where: {
        albumId_mappingId: {
          albumId: defaultAlbum.id,
          mappingId: mappingId,
        },
      },
    });

    let favorited = false;

    if (existingItem) {
      // 已收藏，執行取消收藏
      await prisma.albumItem.delete({
        where: { id: existingItem.id },
      });

      // 記錄審計日誌
      await prisma.auditLog.create({
        data: {
          adminId: auth.admin.id,
          action: "DELETE",
          entity: "album_item",
          entityId: existingItem.id,
          details: {
            albumId: defaultAlbum.id,
            albumName: defaultAlbum.name,
            mappingId: mappingId,
            filename: mapping.filename,
            action: "unfavorite",
          },
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      favorited = false;
    } else {
      // 未收藏，執行收藏
      // 獲取當前最大 order 值
      const maxOrderItem = await prisma.albumItem.findFirst({
        where: { albumId: defaultAlbum.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const nextOrder = maxOrderItem ? maxOrderItem.order + 1 : 0;

      const newItem = await prisma.albumItem.create({
        data: {
          albumId: defaultAlbum.id,
          mappingId: mappingId,
          order: nextOrder,
        },
      });

      // 記錄審計日誌
      await prisma.auditLog.create({
        data: {
          adminId: auth.admin.id,
          action: "CREATE",
          entity: "album_item",
          entityId: newItem.id,
          details: {
            albumId: defaultAlbum.id,
            albumName: defaultAlbum.name,
            mappingId: mappingId,
            filename: mapping.filename,
            action: "favorite",
          },
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      favorited = true;
    }

    // 更新相簿的 updatedAt
    await prisma.album.update({
      where: { id: defaultAlbum.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      favorited,
      albumId: defaultAlbum.id,
    });
  } catch (error) {
    console.error("切換收藏狀態失敗:", error);
    return NextResponse.json({ error: "切換收藏狀態失敗" }, { status: 500 });
  }
}
