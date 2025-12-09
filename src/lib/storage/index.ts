/**
 * 統一儲存服務
 *
 * 支援多種儲存後端：
 * - r2: Cloudflare R2（推薦，流量免費）
 * - b2: Backblaze B2（便宜，適合冷儲存）
 * - urusai: Urusai 外部服務
 * - meteor: Meteor 外部服務
 *
 * 特點：
 * - 後台可切換上傳目標
 * - 自動 fallback
 * - 統一介面
 */

import { uploadToR2, isR2Configured, getR2Status } from './r2';

// 儲存提供者類型
export type StorageProvider = 'r2' | 'b2' | 'urusai' | 'meteor';

// 儲存層級
export type StorageTier = 'hot' | 'cold' | 'external';

// 上傳結果
export interface UploadResult {
  success: boolean;
  provider: StorageProvider;
  tier: StorageTier;
  key?: string;           // 儲存路徑（R2/B2）或完整 URL（外部服務）
  url?: string;           // 可訪問的 URL
  hash?: string;          // 檔案 hash
  filename?: string;      // 原始檔名
  size?: number;
  contentType?: string;
  error?: string;
}

// 儲存設定
export interface StorageConfig {
  uploadProvider: StorageProvider;
  fallbackOrder: StorageProvider[];
  enableAutoTiering: boolean;
  hotTierDays: number;
}

// 預設設定
const defaultConfig: StorageConfig = {
  uploadProvider: (process.env.DEFAULT_UPLOAD_PROVIDER as StorageProvider) || 'r2',
  fallbackOrder: ['r2', 'b2', 'urusai', 'meteor'],
  enableAutoTiering: true,
  hotTierDays: 30,
};

/**
 * 取得目前設定
 */
export function getStorageConfig(): StorageConfig {
  // TODO: 之後可以從資料庫讀取設定
  return {
    ...defaultConfig,
    uploadProvider: (process.env.DEFAULT_UPLOAD_PROVIDER as StorageProvider) || defaultConfig.uploadProvider,
  };
}

/**
 * 檢查指定 provider 是否可用
 */
export function isProviderAvailable(provider: StorageProvider): boolean {
  switch (provider) {
    case 'r2':
      return isR2Configured();
    case 'b2':
      // TODO: 實作 B2 檢查
      return false;
    case 'urusai':
      return Boolean(process.env.URUSAI_API_ENDPOINT);
    case 'meteor':
      return process.env.ENABLE_METEOR_FALLBACK === 'true';
    default:
      return false;
  }
}

/**
 * 上傳檔案到指定 provider
 */
async function uploadToProvider(
  provider: StorageProvider,
  buffer: Buffer,
  filename: string,
  hash: string
): Promise<UploadResult> {
  const key = `${hash}${getExtension(filename)}`;

  switch (provider) {
    case 'r2': {
      const result = await uploadToR2(buffer, key);
      if (result.success) {
        return {
          success: true,
          provider: 'r2',
          tier: 'hot',
          key,
          hash,
          filename,
          size: result.size,
          contentType: result.contentType,
        };
      }
      return {
        success: false,
        provider: 'r2',
        tier: 'hot',
        error: result.error,
      };
    }

    case 'urusai': {
      // 使用現有的 Urusai 上傳邏輯
      const result = await uploadToUrusai(buffer, filename);
      if (result.success) {
        return {
          success: true,
          provider: 'urusai',
          tier: 'external',
          key: result.url,
          url: result.url,
          hash,
          filename,
        };
      }
      return {
        success: false,
        provider: 'urusai',
        tier: 'external',
        error: result.error,
      };
    }

    case 'meteor': {
      // 使用現有的 Meteor 上傳邏輯
      const result = await uploadToMeteor(buffer, filename);
      if (result.success) {
        return {
          success: true,
          provider: 'meteor',
          tier: 'external',
          key: result.url,
          url: result.url,
          hash,
          filename,
        };
      }
      return {
        success: false,
        provider: 'meteor',
        tier: 'external',
        error: result.error,
      };
    }

    case 'b2':
      // TODO: 實作 B2 上傳
      return {
        success: false,
        provider: 'b2',
        tier: 'cold',
        error: 'B2 尚未實作',
      };

    default:
      return {
        success: false,
        provider,
        tier: 'external',
        error: `不支援的 provider: ${provider}`,
      };
  }
}

/**
 * 統一上傳介面（帶 fallback）
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  hash: string,
  preferredProvider?: StorageProvider
): Promise<UploadResult> {
  const config = getStorageConfig();
  const provider = preferredProvider || config.uploadProvider;

  // 建立嘗試順序：優先使用指定的 provider，然後按 fallback 順序
  const tryOrder = [provider, ...config.fallbackOrder.filter(p => p !== provider)];

  for (const p of tryOrder) {
    if (!isProviderAvailable(p)) {
      console.log(`[Storage] ${p} 不可用，跳過`);
      continue;
    }

    console.log(`[Storage] 嘗試上傳到 ${p}...`);
    const result = await uploadToProvider(p, buffer, filename, hash);

    if (result.success) {
      console.log(`[Storage] 上傳成功: ${p}`);
      return result;
    }

    console.log(`[Storage] ${p} 上傳失敗: ${result.error}`);
  }

  return {
    success: false,
    provider,
    tier: 'external',
    error: '所有儲存服務都失敗了',
  };
}

/**
 * 取得檔案副檔名（含點號）
 */
function getExtension(filename: string): string {
  const match = filename.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : '.png';
}

// ===== 外部服務上傳（保留現有邏輯）=====

/**
 * 上傳到 Urusai
 */
async function uploadToUrusai(
  buffer: Buffer,
  filename: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const endpoint = process.env.URUSAI_API_ENDPOINT;
    if (!endpoint) {
      return { success: false, error: 'Urusai endpoint 未設定' };
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)]);
    formData.append('file', blob, filename);

    if (process.env.URUSAI_TOKEN) {
      formData.append('token', process.env.URUSAI_TOKEN);
    }
    formData.append('r18', process.env.URUSAI_R18 || '0');

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(parseInt(process.env.UPLOAD_PROVIDER_TIMEOUT_MS || '12000')),
    });

    if (!response.ok) {
      return { success: false, error: `Urusai 回應錯誤: ${response.status}` };
    }

    const data = await response.json();

    if (data.code === 200 && data.data?.url) {
      return { success: true, url: data.data.url };
    }

    return { success: false, error: data.msg || '上傳失敗' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上傳失敗',
    };
  }
}

/**
 * 上傳到 Meteor
 */
async function uploadToMeteor(
  buffer: Buffer,
  filename: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)]);
    formData.append('file', blob, filename);

    const response = await fetch('https://api.imgkr.com/api/v2/files/upload', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(parseInt(process.env.UPLOAD_PROVIDER_TIMEOUT_MS || '12000')),
    });

    if (!response.ok) {
      return { success: false, error: `Meteor 回應錯誤: ${response.status}` };
    }

    const data = await response.json();

    if (data.success && data.data) {
      return { success: true, url: data.data };
    }

    return { success: false, error: data.message || '上傳失敗' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上傳失敗',
    };
  }
}

/**
 * 取得所有 provider 的狀態（用於後台顯示）
 */
export function getAllProviderStatus(): Record<StorageProvider, {
  available: boolean;
  configured: boolean;
  details?: any;
}> {
  return {
    r2: {
      available: isProviderAvailable('r2'),
      configured: isR2Configured(),
      details: getR2Status(),
    },
    b2: {
      available: false,
      configured: false,
      details: { message: '尚未實作' },
    },
    urusai: {
      available: isProviderAvailable('urusai'),
      configured: Boolean(process.env.URUSAI_API_ENDPOINT),
    },
    meteor: {
      available: isProviderAvailable('meteor'),
      configured: process.env.ENABLE_METEOR_FALLBACK === 'true',
    },
  };
}
