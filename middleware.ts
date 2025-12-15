import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cloudflare Worker 代理 URL
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'https://i.duk.tw';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 帶副檔名的圖片路徑 → 重定向到 Cloudflare Worker
  const imageMatch = pathname.match(/^\/([a-zA-Z0-9]+)\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i);
  if (imageMatch) {
    const [, hash, ext] = imageMatch;
    const proxyUrl = `${PROXY_URL}/${hash}.${ext}`;
    return NextResponse.redirect(proxyUrl, { status: 302 });
  }

  // 純 hash 路徑已由 Cloudflare Page Rule 處理，不需要在這裡處理
  return NextResponse.next();
}

// 只匹配帶圖片副檔名的路徑（純 hash 由 Cloudflare Page Rule 處理）
export const config = {
  matcher: [
    '/:path*.(jpg|jpeg|png|gif|webp|svg|bmp|ico)',
  ],
};