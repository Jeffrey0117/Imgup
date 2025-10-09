import { NextRequest } from 'next/server';

// 檔案類型白名單
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/ico',
  'image/x-icon',
]);

// 檔案擴展名白名單
const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.ico',
]);

// 檔案簽名（Magic Numbers）
const FILE_SIGNATURES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF header
  bmp: [0x42, 0x4D],
  ico: [0x00, 0x00, 0x01, 0x00],
};

// 預設最大檔案大小（25MB）
const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024;

interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  extension?: string;
  size?: number;
}

/**
 * 獲取檔案的二進位簽名
 */
function getFileSignature(buffer: ArrayBuffer, length: number = 4): number[] {
  const arr = new Uint8Array(buffer);
  const signature: number[] = [];
  
  for (let i = 0; i < Math.min(length, arr.length); i++) {
    signature.push(arr[i]);
  }
  
  return signature;
}

/**
 * 檢查檔案簽名是否匹配
 */
function matchesSignature(signature: number[], expected: number[]): boolean {
  if (signature.length < expected.length) {
    return false;
  }
  
  for (let i = 0; i < expected.length; i++) {
    if (signature[i] !== expected[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * 驗證檔案簽名
 */
export function validateFileSignature(buffer: ArrayBuffer, mimeType: string): boolean {
  const signature = getFileSignature(buffer, 8);
  
  // JPEG
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return matchesSignature(signature, FILE_SIGNATURES.jpeg);
  }
  
  // PNG
  if (mimeType === 'image/png') {
    return matchesSignature(signature, FILE_SIGNATURES.png);
  }
  
  // GIF
  if (mimeType === 'image/gif') {
    return matchesSignature(signature, FILE_SIGNATURES.gif);
  }
  
  // WebP (需要進一步檢查 WEBP 標記)
  if (mimeType === 'image/webp') {
    if (!matchesSignature(signature, FILE_SIGNATURES.webp)) {
      return false;
    }
    // 檢查 WEBP 標記在偏移 8 的位置
    const webpMarker = getFileSignature(buffer.slice(8, 12), 4);
    return webpMarker[0] === 0x57 && webpMarker[1] === 0x45 && 
           webpMarker[2] === 0x42 && webpMarker[3] === 0x50; // "WEBP"
  }
  
  // BMP
  if (mimeType === 'image/bmp') {
    return matchesSignature(signature, FILE_SIGNATURES.bmp);
  }
  
  // ICO
  if (mimeType === 'image/ico' || mimeType === 'image/x-icon') {
    return matchesSignature(signature, FILE_SIGNATURES.ico);
  }
  
  // SVG (文本格式，檢查是否包含 SVG 標記)
  if (mimeType === 'image/svg+xml') {
    const decoder = new TextDecoder();
    const text = decoder.decode(buffer.slice(0, 1000)); // 檢查前 1000 字節
    return text.includes('<svg') || text.includes('<?xml');
  }
  
  return false;
}

/**
 * 檢查檔案是否包含可疑內容
 */
export function checkForMaliciousContent(buffer: ArrayBuffer, mimeType: string): boolean {
  // SVG 檔案的特殊檢查
  if (mimeType === 'image/svg+xml') {
    const decoder = new TextDecoder();
    const text = decoder.decode(buffer);
    
    // 檢查危險的 SVG 元素和屬性
    const dangerousPatterns = [
      /<script/i,
      /<iframe/i,
      /<embed/i,
      /<object/i,
      /javascript:/i,
      /on\w+\s*=/i, // 事件處理器如 onclick, onload 等
      /<foreignObject/i,
      /<use[^>]*href\s*=\s*["']?(?!#)/i, // 外部引用
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(text)) {
        return true; // 發現可疑內容
      }
    }
  }
  
  // 檢查是否嵌入了可執行檔案簽名
  const signature = getFileSignature(buffer, 4);
  
  // PE 檔案 (Windows 執行檔)
  if (signature[0] === 0x4D && signature[1] === 0x5A) {
    return true;
  }
  
  // ELF 檔案 (Linux 執行檔)
  if (signature[0] === 0x7F && signature[1] === 0x45 && 
      signature[2] === 0x4C && signature[3] === 0x46) {
    return true;
  }
  
  return false;
}

/**
 * 驗證檔案
 */
export async function validateFile(
  file: File | Blob,
  options?: {
    maxSize?: number;
    allowedTypes?: Set<string>;
    allowedExtensions?: Set<string>;
    checkSignature?: boolean;
    checkMalicious?: boolean;
  }
): Promise<FileValidationResult> {
  const maxSize = options?.maxSize || 
    parseInt(process.env.MAX_FILE_SIZE || String(DEFAULT_MAX_FILE_SIZE));
  const allowedTypes = options?.allowedTypes || ALLOWED_MIME_TYPES;
  const allowedExtensions = options?.allowedExtensions || ALLOWED_EXTENSIONS;
  const checkSignature = options?.checkSignature !== false; // 預設啟用
  const checkMalicious = options?.checkMalicious !== false; // 預設啟用
  
  // 檢查檔案大小
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${Math.floor(maxSize / 1024 / 1024)}MB`,
      size: file.size,
    };
  }
  
  // 檢查 MIME 類型
  const mimeType = file.type.toLowerCase();
  if (!allowedTypes.has(mimeType)) {
    return {
      valid: false,
      error: 'Invalid file type',
      mimeType,
    };
  }
  
  // 如果是 File 物件，檢查擴展名
  if ('name' in file && file.name) {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.has(extension)) {
      return {
        valid: false,
        error: 'Invalid file extension',
        extension,
      };
    }
  }
  
  // 讀取檔案內容進行深度檢查
  if (checkSignature || checkMalicious) {
    try {
      const buffer = await file.arrayBuffer();
      
      // 檢查檔案簽名
      if (checkSignature && !validateFileSignature(buffer, mimeType)) {
        return {
          valid: false,
          error: 'File signature does not match MIME type',
          mimeType,
        };
      }
      
      // 檢查惡意內容
      if (checkMalicious && checkForMaliciousContent(buffer, mimeType)) {
        return {
          valid: false,
          error: 'File contains potentially malicious content',
          mimeType,
        };
      }
    } catch (error) {
      console.error('[FileValidation] Error reading file:', error);
      return {
        valid: false,
        error: 'Failed to validate file content',
      };
    }
  }
  
  return {
    valid: true,
    mimeType,
    size: file.size,
  };
}

/**
 * 驗證 Referer/Origin
 */
export function validateOrigin(req: NextRequest): boolean {
  // 開發環境跳過檢查
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  
  // 如果沒有 Origin 和 Referer，可能是直接 API 呼叫
  if (!origin && !referer) {
    // 根據設定決定是否允許
    return process.env.ALLOW_DIRECT_API_CALLS === 'true';
  }
  
  // 取得允許的來源列表
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  
  // 如果沒有設定允許的來源，預設只允許同源
  if (allowedOrigins.length === 0) {
    const host = req.headers.get('host');
    if (host) {
      allowedOrigins.push(`http://${host}`, `https://${host}`);
    }
  }
  
  // 檢查 Origin
  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return true;
  }
  
  // 檢查 Referer
  if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed))) {
    return true;
  }
  
  return false;
}

/**
 * 生成安全的檔案名稱
 */
export function sanitizeFileName(fileName: string): string {
  // 移除路徑分隔符和特殊字符
  let sanitized = fileName
    .replace(/[\/\\]/g, '_') // 路徑分隔符
    .replace(/\.{2,}/g, '_') // 連續的點
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 非英數字符
    .replace(/^\./, '_'); // 開頭的點
  
  // 限制長度
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const extension = sanitized.split('.').pop();
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 1);
    sanitized = `${truncatedName}.${extension}`;
  }
  
  // 如果結果為空，使用預設名稱
  if (!sanitized || sanitized === '_') {
    sanitized = `file_${Date.now()}`;
  }
  
  return sanitized;
}