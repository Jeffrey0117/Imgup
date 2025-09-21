import { NextRequest, NextResponse } from "next/server";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
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

    // 解析請求體
    const body = await request.json().catch(() => ({}));
    const { ids }: { ids?: string[] } = body || {};

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "請提供要刪除的項目 ID 清單" }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: "一次最多只能刪除 100 個項目" }, { status: 400 });
    }

    // 查找要刪除的記錄
    const mappings = await prisma.mapping.findMany({
      where: {
        id: { in: ids }
      },
    });

    if (mappings.length === 0) {
      return NextResponse.json({ error: "找不到指定的檔案" }, { status: 404 });
    }

    // 記錄被刪除的項目資訊（用於審計日誌）
    const deletedMappings = mappings.map(m => ({
      id: m.id,
      hash: m.hash,
      filename: m.filename,
    }));

    // 批量硬刪除
    const deleteResult = await prisma.mapping.deleteMany({
      where: {
        id: { in: ids }
      },
    });

    // 記錄批量審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: authResult.admin!.id,
        action: "BATCH_DELETE",
        entity: "mapping",
        entityId: null, // 批量操作無單一 entityId
        details: {
          deletedCount: deleteResult.count,
          deletedItems: deletedMappings,
          batchDelete: true,
          reason: "管理員批量硬刪除",
        },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: `成功刪除 ${deleteResult.count} 個項目`,
      data: {
        deletedCount: deleteResult.count,
        deletedItems: deletedMappings,
      },
    });
  } catch (error) {
    console.error("批量刪除檔案失敗:", error);
    return NextResponse.json({ error: "批量刪除失敗" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    // 解析請求體
    const body = await request.json().catch(() => ({}));
    const {
      ids,
      operation,
      password,
      expiresAt
    }: {
      ids?: string[];
      operation?: "setPassword" | "clearPassword" | "setExpiry";
      password?: string;
      expiresAt?: string | null;
    } = body || {};

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "請提供要更新的項目 ID 清單" }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: "一次最多只能更新 100 個項目" }, { status: 400 });
    }

    if (!operation) {
      return NextResponse.json({ error: "請指定操作類型" }, { status: 400 });
    }

    // 查找要更新的記錄
    const mappings = await prisma.mapping.findMany({
      where: {
        id: { in: ids }
      },
    });

    if (mappings.length === 0) {
      return NextResponse.json({ error: "找不到指定的檔案" }, { status: 404 });
    }

    let updateData: any = {};
    let successCount = 0;

    // 根據操作類型準備更新資料
    switch (operation) {
      case "setPassword":
        if (!password || password.trim().length === 0) {
          return NextResponse.json({ error: "密碼不能為空" }, { status: 400 });
        }
        updateData.password = password.trim();
        break;

      case "clearPassword":
        updateData.password = null;
        break;

      case "setExpiry":
        if (expiresAt === null || expiresAt === "") {
          updateData.expiresAt = null;
        } else {
          const dt = new Date(expiresAt);
          if (isNaN(dt.getTime())) {
            return NextResponse.json({ error: "無效的過期時間" }, { status: 400 });
          }
          updateData.expiresAt = dt;
        }
        break;

      default:
        return NextResponse.json({ error: "不支援的操作類型" }, { status: 400 });
    }

    // 執行批量更新
    const updateResult = await prisma.mapping.updateMany({
      where: {
        id: { in: ids }
      },
      data: updateData,
    });

    successCount = updateResult.count;

    // 記錄批量審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: authResult.admin!.id,
        action: "BATCH_UPDATE",
        entity: "mapping",
        entityId: null, // 批量操作無單一 entityId
        details: {
          updatedCount: successCount,
          operation,
          updateData: Object.keys(updateData).length > 0 ? updateData : null,
          batchUpdate: true,
          reason: `管理員批量${operation === "setPassword" ? "設定密碼" : operation === "clearPassword" ? "清除密碼" : "設定過期時間"}`,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: `成功更新 ${successCount} 個項目`,
      data: {
        updatedCount: successCount,
        operation,
      },
    });
  } catch (error) {
    console.error("批量更新檔案失敗:", error);
    return NextResponse.json({ error: "批量更新失敗" }, { status: 500 });
  }
}