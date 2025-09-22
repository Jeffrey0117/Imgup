import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 確保 /admin 路徑不會被 [hash] 動態路由捕獲
  if (pathname.startsWith('/admin')) {
    // 讓所有 /admin 路徑正常通過
    return NextResponse.next();
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