import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cloudflare Worker 代理 URL
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'https://proxy.duk.tw';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 確保 /admin 路徑不會被 [hash] 動態路由捕獲
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // 🚀 成本優化：帶副檔名的短網址直接重定向到 Cloudflare Worker
  // 這樣完全不需要調用 Serverless Function，節省 99% 費用
  // Middleware 是 Edge Runtime，幾乎免費
  const match = pathname.match(/^\/([a-zA-Z0-9]+)\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i);
  if (match) {
    const [, hash, ext] = match;

    // 直接 302 重定向到 Cloudflare Worker
    // Worker 會查 KV 快取獲取真實 URL，然後代理圖片
    const proxyUrl = `${PROXY_URL}/${hash}.${ext}`;

    console.log(`[Middleware] 圖片請求直接轉發到 CF: ${pathname} → ${proxyUrl}`);

    return NextResponse.redirect(proxyUrl, {
      status: 302,
      headers: {
        // 讓瀏覽器快取這個重定向 24 小時
        'Cache-Control': 'public, max-age=86400',
      }
    });
  }

  // 其他路徑正常處理
  return NextResponse.next();
}
 
// 設定 middleware 匹配規則
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside public)
     * 4. /favicon.ico, /sitemap.xml, /robots.txt (static files)
     *
     * 注意：現在需要匹配圖片副檔名路徑（如 /xxx.png）以便重定向到 Cloudflare
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|ads.txt).*)',
  ],
};