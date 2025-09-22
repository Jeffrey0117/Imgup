// 檔案副檔名檢測與分類工具

// 支援的副檔名映射
export const SUPPORTED_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
} as const;

// 從 MIME type 檢測副檔名
export function detectFileExtension(mimeType: string): string | null {
  // 檢查是否為支援的 MIME type
  if (SUPPORTED_EXTENSIONS[mimeType as keyof typeof SUPPORTED_EXTENSIONS]) {
    return SUPPORTED_EXTENSIONS[mimeType as keyof typeof SUPPORTED_EXTENSIONS];
  }

  // 特殊處理某些 MIME type 變體
  if (mimeType.startsWith('image/')) {
    const subtype = mimeType.split('/')[1];
    switch (subtype) {
      case 'png':
        return '.png';
      case 'jpeg':
      case 'jpg':
        return '.jpg';
      case 'gif':
        return '.gif';
      case 'webp':
        return '.webp';
      case 'svg+xml':
        return '.svg';
    }
  }

  return null;
}

// 從檔案名稱檢測副檔名（如果 MIME type 無法提供）
export function detectExtensionFromFilename(filename: string): string | null {
  const lowerFilename = filename.toLowerCase();

  if (lowerFilename.endsWith('.png')) return '.png';
  if (lowerFilename.endsWith('.jpg')) return '.jpg';
  if (lowerFilename.endsWith('.jpeg')) return '.jpg';
  if (lowerFilename.endsWith('.gif')) return '.gif';
  if (lowerFilename.endsWith('.webp')) return '.webp';
  if (lowerFilename.endsWith('.svg')) return '.svg';

  return null;
}

// 綜合檢測函數 - 優先使用 MIME type，fallback 到檔案名稱
export function detectFileExtensionComprehensive(
  mimeType: string,
  filename: string
): string | null {
  // 優先使用 MIME type
  let extension = detectFileExtension(mimeType);
  if (extension) return extension;

  // fallback 到檔案名稱檢測
  extension = detectExtensionFromFilename(filename);
  if (extension) return extension;

  return null;
}

// 檢查是否為支援的圖片類型
export function isSupportedImageType(mimeType: string): boolean {
  return mimeType in SUPPORTED_EXTENSIONS || mimeType.startsWith('image/');
}

// 生成帶副檔名的 hash
export function generateHashedFilename(hash: string, extension: string | null): string {
  if (!extension) return hash;
  return `${hash}${extension}`;
}

// 從帶副檔名的 hash 提取原始 hash 和副檔名
export function parseHashedFilename(filename: string): { hash: string; extension: string | null } {
  const lastDotIndex = filename.lastIndexOf('.');

  if (lastDotIndex === -1) {
    // 沒有副檔名
    return { hash: filename, extension: null };
  }

  const extension = filename.substring(lastDotIndex);
  const hash = filename.substring(0, lastDotIndex);

  // 驗證副檔名是否支援
  const supportedExtensions = Object.values(SUPPORTED_EXTENSIONS);
  if (supportedExtensions.includes(extension as any)) {
    return { hash, extension };
  }

  // 如果副檔名不支援，整個當作 hash
  return { hash: filename, extension: null };
}