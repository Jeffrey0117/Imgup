import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
 
  // 確保 /admin 路徑不會被 [hash] 動態路由捕獲
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }
 
  // 帶副檔名的短網址：rewrite 到 Smart Route API
  const match = pathname.match(/^\/([a-zA-Z0-9]+)\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i);
  if (match) {
    const [, hash, ext] = match;
    const url = new URL(`/api/smart-route/${hash}.${ext}`, request.url);
    return NextResponse.rewrite(url);
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
     * 5. Paths with extensions (for smart routing to handle image extensions)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};