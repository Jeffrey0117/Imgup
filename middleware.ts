import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cloudflare Worker 代理 URL（i.duk.tw 直連 Neon，超快）
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'https://i.duk.tw';

// 排除的路徑前綴（這些不是 hash）
const EXCLUDED_PREFIXES = [
  '/admin', '/api', '/login', '/features', '/about',
  '/use-cases', '/guide', '/_next', '/favicon', '/sitemap',
  '/robots', '/ads', '/my-icon'
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. 帶副檔名的圖片路徑 → 直接重定向到 Cloudflare Worker
  const imageMatch = pathname.match(/^\/([a-zA-Z0-9]+)\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i);
  if (imageMatch) {
    const [, hash, ext] = imageMatch;
    const proxyUrl = `${PROXY_URL}/${hash}.${ext}`;
    return NextResponse.redirect(proxyUrl, { status: 302 });
  }

  // 2. 純 hash 路徑（6 字元英數字）→ 重定向到 Cloudflare Worker
  //    Worker 會處理是否導到預覽頁
  const hashMatch = pathname.match(/^\/([a-zA-Z0-9]{6})$/);
  if (hashMatch) {
    const [, hash] = hashMatch;
    const proxyUrl = `${PROXY_URL}/${hash}`;
    return NextResponse.redirect(proxyUrl, { status: 302 });
  }

  return NextResponse.next();
}

// 🔥 優化：只匹配可能是 hash 的路徑
export const config = {
  matcher: [
    // 帶副檔名的圖片路徑
    '/:path*.(jpg|jpeg|png|gif|webp|svg|bmp|ico)',
    // 6 字元的純 hash（排除已知路徑）
    '/:hash([a-zA-Z0-9]{6})',
  ],
};