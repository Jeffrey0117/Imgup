/**
 * Cloudflare R2 Storage Service
 *
 * 提供圖片上傳、讀取、刪除功能
 * 使用 AWS S3 兼容 API
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// R2 設定
const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'duk-images';

// 建立 S3 客戶端（R2 兼容 S3 API）
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 設定不完整，請檢查環境變數');
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

// 上傳結果介面
export interface R2UploadResult {
  success: boolean;
  key?: string;           // R2 中的檔案路徑
  url?: string;           // 完整 URL（如果有 public URL）
  size?: number;          // 檔案大小
  contentType?: string;   // MIME 類型
  error?: string;
}

// 支援的圖片格式對應 Content-Type
const CONTENT_TYPE_MAP: Record<string, string> = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'bmp': 'image/bmp',
  'ico': 'image/x-icon',
};

/**
 * 從檔名或副檔名取得 Content-Type
 */
function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream';
}

/**
 * 上傳檔案到 R2
 *
 * @param buffer - 檔案內容
 * @param key - R2 中的檔案路徑（例如：hash.png）
 * @param contentType - MIME 類型（可選，會自動偵測）
 */
export async function uploadToR2(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  key: string,
  contentType?: string
): Promise<R2UploadResult> {
  try {
    const client = getS3Client();
    const finalContentType = contentType || getContentType(key);

    // 確保 buffer 是正確的格式
    let body: Buffer;
    if (buffer instanceof Buffer) {
      body = buffer;
    } else if (buffer instanceof Uint8Array) {
      body = Buffer.from(buffer);
    } else {
      body = Buffer.from(new Uint8Array(buffer));
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: finalContentType,
      // 設定快取（1 年，因為圖片內容不會變）
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await client.send(command);

    console.log(`[R2] 上傳成功: ${key} (${body.length} bytes)`);

    return {
      success: true,
      key,
      size: body.length,
      contentType: finalContentType,
    };
  } catch (error) {
    console.error('[R2] 上傳失敗:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上傳失敗',
    };
  }
}

/**
 * 從 R2 讀取檔案
 *
 * @param key - R2 中的檔案路徑
 * @returns 檔案內容和 metadata
 */
export async function getFromR2(key: string): Promise<{
  success: boolean;
  body?: ReadableStream;
  contentType?: string;
  contentLength?: number;
  error?: string;
}> {
  try {
    const client = getS3Client();

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await client.send(command);

    return {
      success: true,
      body: response.Body as unknown as ReadableStream,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  } catch (error) {
    console.error('[R2] 讀取失敗:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '讀取失敗',
    };
  }
}

/**
 * 檢查檔案是否存在於 R2
 *
 * @param key - R2 中的檔案路徑
 */
export async function existsInR2(key: string): Promise<boolean> {
  try {
    const client = getS3Client();

    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 從 R2 刪除檔案
 *
 * @param key - R2 中的檔案路徑
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    const client = getS3Client();

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
    console.log(`[R2] 刪除成功: ${key}`);
    return true;
  } catch (error) {
    console.error('[R2] 刪除失敗:', error);
    return false;
  }
}

/**
 * 檢查 R2 設定是否完整
 */
export function isR2Configured(): boolean {
  return Boolean(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
}

/**
 * 取得 R2 設定狀態（用於後台顯示）
 */
export function getR2Status(): {
  configured: boolean;
  endpoint?: string;
  bucket?: string;
} {
  return {
    configured: isR2Configured(),
    endpoint: R2_ENDPOINT ? R2_ENDPOINT.replace(/https?:\/\//, '').split('.')[0] + '...' : undefined,
    bucket: R2_BUCKET_NAME || undefined,
  };
}
