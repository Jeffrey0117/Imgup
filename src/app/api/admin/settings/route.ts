import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/utils/admin-auth";
import { prisma } from "@/lib/prisma";
import { clearSettingsCache } from "@/lib/system-config";

// 預設系統設定
const DEFAULT_SETTINGS = {
  // 上傳設定
  uploadApiKey: "",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"],

  // Rate Limit 設定
  guestRateLimit: 5,
  memberRateLimit: 20,
  premiumRateLimit: 60,

  // 安全設定
  enableOriginCheck: true,
  enableUserAgentCheck: true,
  enableFileSignatureCheck: true,

  // 儲存設定
  defaultUploadProvider: "r2",
  enableR2Storage: true,
};

// 設定 key 映射
const CONFIG_KEYS = {
  uploadApiKey: "upload_api_key",
  maxFileSize: "max_file_size",
  allowedFormats: "allowed_formats",
  guestRateLimit: "guest_rate_limit",
  memberRateLimit: "member_rate_limit",
  premiumRateLimit: "premium_rate_limit",
  enableOriginCheck: "enable_origin_check",
  enableUserAgentCheck: "enable_user_agent_check",
  enableFileSignatureCheck: "enable_file_signature_check",
  defaultUploadProvider: "default_upload_provider",
  enableR2Storage: "enable_r2_storage",
};

/**
 * GET /api/admin/settings
 * 獲取系統設定
 */
export async function GET(request: NextRequest) {
  try {
    await authenticateAdmin(request);

    // 從資料庫獲取所有設定
    const configs = await prisma.systemConfig.findMany();

    // 建立設定物件，使用預設值填補缺失的設定
    const settings = { ...DEFAULT_SETTINGS };

    for (const config of configs) {
      const settingKey = Object.entries(CONFIG_KEYS).find(
        ([, dbKey]) => dbKey === config.key
      )?.[0];

      if (settingKey && settingKey in settings) {
        (settings as any)[settingKey] = config.value;
      }
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("獲取設定失敗:", error);
    return NextResponse.json({ error: "獲取設定失敗" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings
 * 更新系統設定
 */
export async function PUT(request: NextRequest) {
  try {
    const { admin } = await authenticateAdmin(request);
    const body = await request.json();

    // 驗證並更新設定
    const updates: { key: string; value: any }[] = [];

    for (const [settingKey, dbKey] of Object.entries(CONFIG_KEYS)) {
      if (settingKey in body && settingKey !== "uploadApiKey") {
        // API Key 使用獨立端點更新
        const value = body[settingKey];

        // 驗證設定值
        const validationError = validateSetting(settingKey, value);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }

        updates.push({ key: dbKey, value });
      }
    }

    // 批量更新設定
    await Promise.all(
      updates.map((update) =>
        prisma.systemConfig.upsert({
          where: { key: update.key },
          update: {
            value: update.value,
            updatedAt: new Date(),
            updatedBy: admin.id,
          },
          create: {
            key: update.key,
            value: update.value,
            updatedBy: admin.id,
          },
        })
      )
    );

    // 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "update",
        entity: "system_settings",
        details: { updatedKeys: updates.map((u) => u.key) },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    // 清除設定快取，讓新設定立即生效
    clearSettingsCache();

    return NextResponse.json({
      success: true,
      message: "設定已更新",
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("更新設定失敗:", error);
    return NextResponse.json({ error: "更新設定失敗" }, { status: 500 });
  }
}

/**
 * 驗證設定值
 */
function validateSetting(key: string, value: any): string | null {
  switch (key) {
    case "maxFileSize":
      if (typeof value !== "number" || value < 1024 || value > 100 * 1024 * 1024) {
        return "檔案大小必須在 1KB ~ 100MB 之間";
      }
      break;

    case "guestRateLimit":
    case "memberRateLimit":
    case "premiumRateLimit":
      if (typeof value !== "number" || value < 1 || value > 500) {
        return "Rate limit 必須在 1 ~ 500 之間";
      }
      break;

    case "enableOriginCheck":
    case "enableUserAgentCheck":
    case "enableFileSignatureCheck":
    case "enableR2Storage":
      if (typeof value !== "boolean") {
        return "此設定必須是布林值";
      }
      break;

    case "defaultUploadProvider":
      if (!["r2", "urusai", "meteor"].includes(value)) {
        return "無效的上傳服務提供者";
      }
      break;

    case "allowedFormats":
      if (!Array.isArray(value) || value.length === 0) {
        return "允許的格式必須是非空陣列";
      }
      break;
  }

  return null;
}
