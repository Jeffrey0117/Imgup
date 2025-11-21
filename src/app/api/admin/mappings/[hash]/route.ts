import { NextRequest, NextResponse } from "next/server";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
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

    const { hash } = await params;

    // 查找檔案記錄
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
    });

    if (!mapping) {
      return NextResponse.json({ error: "找不到該檔案" }, { status: 404 });
    }

    // 硬刪除：從資料庫移除該記錄
    await prisma.mapping.delete({
      where: { hash },
    });

    // 記錄審計日誌（標記為硬刪除）
    await prisma.auditLog.create({
      data: {
        adminId: authResult.admin!.id,
        action: "DELETE",
        entity: "mapping",
        entityId: mapping.id,
        details: {
          hash: mapping.hash,
          filename: mapping.filename,
          hardDelete: true,
          reason: "管理員硬刪除",
        },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "檔案已永久刪除",
    });
  } catch (error) {
    console.error("刪除檔案失敗:", error);
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
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

    const { hash } = await params;

    // 查找檔案記錄
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
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
      // Admin API 可以回傳實際密碼值
      password: mapping.password,
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    // 驗證管理員身份（支援 Header Bearer 與 Cookie）
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

    const authResult = await verifyAdminSession(token);
    if (!authResult.valid) {
      return NextResponse.json({ error: "身份驗證失敗" }, { status: 401 });
    }

    const { hash } = await params;
    const body = await request.json().catch(() => ({}));

    const {
      filename,
      expiresAt,
      password,
      removePassword,
    }: {
      filename?: string;
      expiresAt?: string | null;
      password?: string | null;
      removePassword?: boolean;
    } = body || {};

    // 取得原始記錄
    const existing = await prisma.mapping.findUnique({ where: { hash } });
    if (!existing) {
      return NextResponse.json({ error: "找不到該檔案" }, { status: 404 });
    }

    const updateData: any = {};

    if (typeof filename === "string") {
      const nextName = filename.trim();
      if (nextName.length === 0) {
        return NextResponse.json({ error: "檔名不可為空白" }, { status: 400 });
      }
      updateData.filename = nextName;
    }

    if (Object.prototype.hasOwnProperty.call(body, "expiresAt")) {
      if (expiresAt === null || expiresAt === "") {
        updateData.expiresAt = null;
      } else {
        const dt = new Date(expiresAt as string);
        if (isNaN(dt.getTime())) {
          return NextResponse.json(
            { error: "無效的過期時間" },
            { status: 400 }
          );
        }
        updateData.expiresAt = dt;
      }
    }

    if (removePassword === true) {
      updateData.password = null;
    } else if (Object.prototype.hasOwnProperty.call(body, "password")) {
      // 設置密碼或清除空字串
      updateData.password = password && password.length ? password : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
    }

    const updated = await prisma.mapping.update({
      where: { hash },
      data: updateData,
    });

    // 審計日誌
    try {
      await prisma.auditLog.create({
        data: {
          adminId: authResult.admin!.id,
          action: "UPDATE",
          entity: "mapping",
          entityId: updated.id,
          details: {
            hash: updated.hash,
            before: {
              filename: existing.filename,
              expiresAt: existing.expiresAt
                ? existing.expiresAt.toISOString()
                : null,
              hasPassword: !!existing.password,
            },
            after: {
              filename: updated.filename,
              expiresAt: updated.expiresAt
                ? updated.expiresAt.toISOString()
                : null,
              hasPassword: !!updated.password,
            },
          },
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch (e) {
      // 不阻斷主要流程
      console.warn("寫入審計日誌失敗:", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        hash: updated.hash,
        filename: updated.filename,
        url: updated.url,
        shortUrl: updated.shortUrl,
        createdAt: updated.createdAt.toISOString(),
        expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null,
        isDeleted: updated.isDeleted,
        deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
        isExpired: updated.expiresAt ? updated.expiresAt < new Date() : false,
        hasPassword: !!updated.password,
      },
    });
  } catch (error) {
    console.error("更新檔案失敗:", error);
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}
