import { NextRequest, NextResponse } from "next/server";
import { withPermissionAndCsrf } from "@/middleware/admin-auth";
import { PERMISSIONS } from "@/utils/rbac";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/utils/admin-auth";

// 批量刪除 - 僅限 admin 角色（啟用 CSRF 保護）
export const DELETE = withPermissionAndCsrf(PERMISSIONS.MAPPING_BATCH_DELETE)(
  async (request) => {
    try {

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
          adminId: request.admin!.id,
          action: "BATCH_DELETE",
          entity: "mapping",
          entityId: null, // 批量操作無單一 entityId
          details: {
            deletedCount: deleteResult.count,
            deletedItems: deletedMappings,
            batchDelete: true,
            reason: "管理員批量硬刪除",
          },
          ipAddress: getClientIp(request),
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
    } catch (error: any) {
      console.error("批量刪除檔案失敗:", error);
      return NextResponse.json({ error: "批量刪除失敗" }, { status: 500 });
    }
  }
);

// 批量更新 - moderator 和 admin 都可使用（啟用 CSRF 保護）
export const PUT = withPermissionAndCsrf(PERMISSIONS.MAPPING_BATCH_UPDATE)(
  async (request) => {
    try {

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
        if (!expiresAt || expiresAt === "") {
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
          adminId: request.admin!.id,
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
          ipAddress: getClientIp(request),
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
    } catch (error: any) {
      console.error("批量更新檔案失敗:", error);
      return NextResponse.json({ error: "批量更新失敗" }, { status: 500 });
    }
  }
);