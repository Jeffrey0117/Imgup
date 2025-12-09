/**
 * 系統設定工具
 * 從資料庫讀取後台設定，並提供快取以減少資料庫查詢
 */

import { prisma } from "@/lib/prisma";

// 設定快取（避免每次請求都查資料庫）
let settingsCache: SystemSettings | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 1000; // 60 秒快取

// 預設系統設定
const DEFAULT_SETTINGS: SystemSettings = {
  // 上傳設定
  uploadApiKey: "",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"],

  // Rate Limit 設定
  guestRateLimit: 5,
  memberRateLimit: 20,
  premiumRateLimit: 60,

  // 安全設定
  enableOriginCheck: false,
  enableUserAgentCheck: false,
  enableFileSignatureCheck: false,

  // 儲存設定
  defaultUploadProvider: "r2",
  enableR2Storage: true,
};

// 設定 key 映射（資料庫 key → 程式 key）
const CONFIG_KEYS: Record<string, keyof SystemSettings> = {
  upload_api_key: "uploadApiKey",
  max_file_size: "maxFileSize",
  allowed_formats: "allowedFormats",
  guest_rate_limit: "guestRateLimit",
  member_rate_limit: "memberRateLimit",
  premium_rate_limit: "premiumRateLimit",
  enable_origin_check: "enableOriginCheck",
  enable_user_agent_check: "enableUserAgentCheck",
  enable_file_signature_check: "enableFileSignatureCheck",
  default_upload_provider: "defaultUploadProvider",
  enable_r2_storage: "enableR2Storage",
};

export interface SystemSettings {
  // 上傳設定
  uploadApiKey: string;
  maxFileSize: number;
  allowedFormats: string[];

  // Rate Limit 設定
  guestRateLimit: number;
  memberRateLimit: number;
  premiumRateLimit: number;

  // 安全設定
  enableOriginCheck: boolean;
  enableUserAgentCheck: boolean;
  enableFileSignatureCheck: boolean;

  // 儲存設定
  defaultUploadProvider: string;
  enableR2Storage: boolean;
}

/**
 * 取得系統設定（有快取）
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  const now = Date.now();

  // 檢查快取是否有效
  if (settingsCache && cacheExpiry > now) {
    return settingsCache;
  }

  try {
    // 從資料庫讀取所有設定
    const configs = await prisma.systemConfig.findMany();

    // 合併資料庫設定與預設值
    const settings = { ...DEFAULT_SETTINGS };

    for (const config of configs) {
      const settingKey = CONFIG_KEYS[config.key];
      if (settingKey && settingKey in settings) {
        (settings as any)[settingKey] = config.value;
      }
    }

    // 更新快取
    settingsCache = settings;
    cacheExpiry = now + CACHE_TTL;

    return settings;
  } catch (error) {
    console.error("[SystemConfig] 讀取設定失敗，使用預設值:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 取得單一設定值
 */
export async function getConfigValue<K extends keyof SystemSettings>(
  key: K
): Promise<SystemSettings[K]> {
  const settings = await getSystemSettings();
  return settings[key];
}

/**
 * 清除設定快取（當後台更新設定時呼叫）
 */
export function clearSettingsCache(): void {
  settingsCache = null;
  cacheExpiry = 0;
}

/**
 * 取得上傳相關設定（常用，獨立函數方便呼叫）
 */
export async function getUploadSettings() {
  const settings = await getSystemSettings();
  return {
    apiKey: settings.uploadApiKey,
    maxFileSize: settings.maxFileSize,
    allowedFormats: settings.allowedFormats,
    defaultProvider: settings.defaultUploadProvider,
    enableR2: settings.enableR2Storage,
    enableOriginCheck: settings.enableOriginCheck,
    enableFileSignatureCheck: settings.enableFileSignatureCheck,
  };
}

/**
 * 取得 Rate Limit 設定
 */
export async function getRateLimitSettings() {
  const settings = await getSystemSettings();
  return {
    guest: settings.guestRateLimit,
    member: settings.memberRateLimit,
    premium: settings.premiumRateLimit,
  };
}
