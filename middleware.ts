import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cloudflare Worker 代理 URL（i.duk.tw 直連 Neon，超快）
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'https://i.duk.tw';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 🚀 成本優化：帶副檔名的短網址直接重定向到 Cloudflare Worker
  // Matcher 已經限制只有圖片路徑會進來，不需要再次檢查
  const match = pathname.match(/^\/([a-zA-Z0-9]+)\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i);
  if (match) {
    const [, hash, ext] = match;
    const proxyUrl = `${PROXY_URL}/${hash}.${ext}`;

    return NextResponse.redirect(proxyUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=86400',
      }
    });
  }

  return NextResponse.next();
}

// 🔥 關鍵優化：只匹配帶圖片副檔名的路徑
// 這樣可以減少 99% 的 Edge Request，大幅降低費用
export const config = {
  matcher: [
    // 只匹配 /xxx.jpg, /xxx.png 等圖片路徑
    '/:hash(\\w+).(jpg|jpeg|png|gif|webp|svg|bmp|ico)',
  ],
};