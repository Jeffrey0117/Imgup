import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/utils/admin-auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * PUT /api/admin/settings/api-key
 * 更新上傳 API Key
 */
export async function PUT(request: NextRequest) {
  try {
    const { admin } = await authenticateAdmin(request);
    const body = await request.json();
    const { apiKey } = body;

    // 驗證 API Key 格式
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "請提供有效的 API Key" },
        { status: 400 }
      );
    }

    // 驗證 API Key 格式（必須以 duk_ 開頭，後接 32 個字元）
    if (!/^duk_[A-Za-z0-9]{32}$/.test(apiKey)) {
      return NextResponse.json(
        { error: "API Key 格式無效（必須為 duk_ 開頭加 32 字元）" },
        { status: 400 }
      );
    }

    // 對 API Key 進行雜湊處理後儲存（安全考量）
    const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");

    // 更新資料庫
    await prisma.systemConfig.upsert({
      where: { key: "upload_api_key" },
      update: {
        value: apiKey, // 儲存原始 key 以便顯示（或改儲存 hash）
        updatedAt: new Date(),
        updatedBy: admin.id,
      },
      create: {
        key: "upload_api_key",
        value: apiKey,
        updatedBy: admin.id,
      },
    });

    // 同時儲存 hash 版本用於驗證
    await prisma.systemConfig.upsert({
      where: { key: "upload_api_key_hash" },
      update: {
        value: hashedKey,
        updatedAt: new Date(),
        updatedBy: admin.id,
      },
      create: {
        key: "upload_api_key_hash",
        value: hashedKey,
        updatedBy: admin.id,
      },
    });

    // 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "update",
        entity: "api_key",
        details: {
          action: "api_key_rotated",
          keyPrefix: apiKey.substring(0, 8) + "...",
        },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "API Key 已更新",
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("更新 API Key 失敗:", error);
    return NextResponse.json({ error: "更新 API Key 失敗" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/settings/api-key
 * 停用 API Key（清空）
 */
export async function DELETE(request: NextRequest) {
  try {
    const { admin } = await authenticateAdmin(request);

    // 刪除 API Key
    await prisma.systemConfig.deleteMany({
      where: {
        key: {
          in: ["upload_api_key", "upload_api_key_hash"],
        },
      },
    });

    // 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "delete",
        entity: "api_key",
        details: { action: "api_key_disabled" },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "API Key 已停用",
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("停用 API Key 失敗:", error);
    return NextResponse.json({ error: "停用 API Key 失敗" }, { status: 500 });
  }
}
