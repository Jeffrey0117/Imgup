/**
 * 圖片代理 URL 生成工具
 *
 * 用途：統一管理圖片代理 URL，方便在 Vercel 和 Cloudflare Workers 之間切換
 *
 * 優先級：
 * 1. Cloudflare Workers (NEXT_PUBLIC_PROXY_URL)
 * 2. Fallback to Vercel API (/api/proxy-image)
 */

/**
 * 生成圖片代理 URL（Hash 模式）
 * @param hash 圖片的 hash ID
 * @returns 代理後的 URL
 */
export function getProxyImageUrl(hash: string): string {
  // 優先使用 Cloudflare Workers（hash 模式）
  const proxyBaseUrl =
    process.env.NEXT_PUBLIC_PROXY_URL || '/api/smart-route';

  // Hash 模式：直接使用 hash，Worker 會自己查詢映射
  return `${proxyBaseUrl}/${hash}`;
}

/**
 * 檢查是否使用 Cloudflare Workers
 * @returns boolean
 */
export function isUsingCloudflareProxy(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PROXY_URL);
}

/**
 * 獲取當前代理類型
 * @returns 'cloudflare' | 'vercel'
 */
export function getProxyType(): 'cloudflare' | 'vercel' {
  return isUsingCloudflareProxy() ? 'cloudflare' : 'vercel';
}
