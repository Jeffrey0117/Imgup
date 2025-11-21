/**
 * URL 驗證輔助函數
 * 用於驗證和處理圖片 URL
 */

/**
 * 驗證 URL 是否為有效的圖片網址
 * @param url - 要驗證的 URL 字串
 * @returns 是否為有效的圖片 URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // 檢查是否為 http/https 協議
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // 檢查是否有常見圖片副檔名
    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.svg',
      '.bmp',
      '.ico',
      '.avif',
      '.tiff',
      '.tif'
    ];

    const pathname = parsed.pathname.toLowerCase();

    // 檢查路徑是否以圖片副檔名結尾
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));

    if (!hasImageExtension) {
      // 如果沒有副檔名，也可能是動態圖片 URL (例如 CDN 或圖床)
      // 這種情況下返回 false，需要額外驗證
      return false;
    }

    return true;
  } catch (error) {
    // URL 解析失敗
    return false;
  }
}

/**
 * 從 URL 提取檔名
 * @param url - URL 字串
 * @returns 提取的檔名
 */
export function extractFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/');

    // 取得最後一個路徑段落
    const lastSegment = segments[segments.length - 1];

    // 如果有檔名，返回它；否則使用預設名稱
    if (lastSegment && lastSegment.length > 0) {
      // 移除 query string（如果有的話）
      const filename = lastSegment.split('?')[0];
      return decodeURIComponent(filename);
    }

    return 'untitled';
  } catch (error) {
    return 'untitled';
  }
}

/**
 * 驗證 URL 是否可訪問（發送 HEAD 請求）
 * @param url - 要檢查的 URL
 * @param timeoutMs - 超時時間（毫秒）
 * @returns 是否可訪問
 */
export async function isUrlAccessible(
  url: string,
  timeoutMs: number = 5000
): Promise<{ accessible: boolean; contentType?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UpImg/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        accessible: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('Content-Type') || undefined;

    return {
      accessible: true,
      contentType,
    };
  } catch (error: any) {
    return {
      accessible: false,
      error: error.name === 'AbortError'
        ? 'Request timeout'
        : error.message || 'Unknown error',
    };
  }
}

/**
 * 驗證 URL 的 Content-Type 是否為圖片類型
 * @param contentType - Content-Type 字串
 * @returns 是否為圖片類型
 */
export function isImageContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;

  const imageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/avif',
    'image/tiff',
  ];

  const normalizedType = contentType.toLowerCase().split(';')[0].trim();

  return imageTypes.includes(normalizedType);
}

/**
 * 完整驗證圖片 URL（格式 + 可訪問性 + Content-Type）
 * @param url - 要驗證的 URL
 * @param checkAccessibility - 是否檢查可訪問性（發送網路請求）
 * @returns 驗證結果
 */
export async function validateImageUrl(
  url: string,
  checkAccessibility: boolean = true
): Promise<{
  valid: boolean;
  error?: string;
  filename?: string;
  contentType?: string;
}> {
  // 1. 驗證 URL 格式
  if (!isValidImageUrl(url)) {
    return {
      valid: false,
      error: 'Invalid URL format or not an image URL',
    };
  }

  // 2. 提取檔名
  const filename = extractFilenameFromUrl(url);

  // 3. 如果需要，檢查可訪問性
  if (checkAccessibility) {
    const accessibilityCheck = await isUrlAccessible(url);

    if (!accessibilityCheck.accessible) {
      return {
        valid: false,
        error: accessibilityCheck.error || 'URL is not accessible',
        filename,
      };
    }

    // 4. 驗證 Content-Type
    if (!isImageContentType(accessibilityCheck.contentType)) {
      return {
        valid: false,
        error: `Invalid content type: ${accessibilityCheck.contentType || 'unknown'}`,
        filename,
        contentType: accessibilityCheck.contentType,
      };
    }

    return {
      valid: true,
      filename,
      contentType: accessibilityCheck.contentType,
    };
  }

  // 如果不檢查可訪問性，只返回格式驗證結果
  return {
    valid: true,
    filename,
  };
}

/**
 * 標準化圖片 URL（移除追蹤參數等）
 * @param url - 原始 URL
 * @returns 標準化後的 URL
 */
export function normalizeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // 移除常見的追蹤參數
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'ref',
      'source',
    ];

    trackingParams.forEach(param => {
      parsed.searchParams.delete(param);
    });

    return parsed.toString();
  } catch (error) {
    // 如果解析失敗，返回原始 URL
    return url;
  }
}
