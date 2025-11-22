import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";

/**
 * GET /api/admin/albums/[id]/items
 * 獲取相簿內所有圖片
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // 獲取相簿
    const album = await prisma.album.findUnique({
      where: { id },
    });

    if (!album) {
      return NextResponse.json({ error: "找不到該相簿" }, { status: 404 });
    }

    // 驗證相簿所有權
    if (album.adminId !== auth.admin.id) {
      return NextResponse.json({ error: "無權訪問此相簿" }, { status: 403 });
    }

    // 獲取相簿內的所有項目
    const items = await prisma.albumItem.findMany({
      where: {
        albumId: id,
      },
      include: {
        mapping: {
          select: {
            id: true,
            hash: true,
            filename: true,
            url: true,
            shortUrl: true,
            createdAt: true,
            expiresAt: true,
            isDeleted: true,
            fileExtension: true,
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    const data = {
      album: {
        id: album.id,
        name: album.name,
        description: album.description,
        coverImageHash: album.coverImageHash,
        createdAt: album.createdAt.toISOString(),
        updatedAt: album.updatedAt.toISOString(),
      },
      items: items.map((item) => ({
        id: item.id,
        order: item.order,
        note: item.note,
        createdAt: item.createdAt.toISOString(),
        mapping: {
          id: item.mapping.id,
          hash: item.mapping.hash,
          filename: item.mapping.filename,
          url: item.mapping.url,
          shortUrl: item.mapping.shortUrl,
          createdAt: item.mapping.createdAt.toISOString(),
          expiresAt: item.mapping.expiresAt
            ? item.mapping.expiresAt.toISOString()
            : null,
          isDeleted: item.mapping.isDeleted,
          fileExtension: item.mapping.fileExtension,
        },
      })),
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("獲取相簿項目失敗:", error);
    return NextResponse.json({ error: "獲取相簿項目失敗" }, { status: 500 });
  }
}

/**
 * POST /api/admin/albums/[id]/items
 * 收藏圖片到相簿
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

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

    // 解析請求體
    const body = await request.json().catch(() => ({}));
    const { mappingId, note } = body;

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

    // 檢查是否已經收藏
    const existing = await prisma.albumItem.findUnique({
      where: {
        albumId_mappingId: {
          albumId: id,
          mappingId: mappingId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "該圖片已在此相簿中" },
        { status: 400 }
      );
    }

    // 獲取當前最大 order 值
    const maxOrderItem = await prisma.albumItem.findFirst({
      where: { albumId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = maxOrderItem ? maxOrderItem.order + 1 : 0;

    // 創建相簿項目
    const item = await prisma.albumItem.create({
      data: {
        albumId: id,
        mappingId: mappingId,
        note: note && typeof note === "string" ? note.trim() : null,
        order: nextOrder,
      },
      include: {
        mapping: {
          select: {
            id: true,
            hash: true,
            filename: true,
            url: true,
            shortUrl: true,
            createdAt: true,
            expiresAt: true,
            isDeleted: true,
            fileExtension: true,
          },
        },
      },
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
        action: "CREATE",
        entity: "album_item",
        entityId: item.id,
        details: {
          albumId: id,
          albumName: album.name,
          mappingId: mappingId,
          filename: mapping.filename,
          note: item.note,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        order: item.order,
        note: item.note,
        createdAt: item.createdAt.toISOString(),
        mapping: {
          id: item.mapping.id,
          hash: item.mapping.hash,
          filename: item.mapping.filename,
          url: item.mapping.url,
          shortUrl: item.mapping.shortUrl,
          createdAt: item.mapping.createdAt.toISOString(),
          expiresAt: item.mapping.expiresAt
            ? item.mapping.expiresAt.toISOString()
            : null,
          isDeleted: item.mapping.isDeleted,
          fileExtension: item.mapping.fileExtension,
        },
      },
    });
  } catch (error) {
    console.error("添加相簿項目失敗:", error);
    return NextResponse.json({ error: "添加相簿項目失敗" }, { status: 500 });
  }
}
