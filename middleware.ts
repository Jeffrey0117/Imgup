import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { isValidHash } from "./src/utils/hash";

// 在 Edge Runtime 中不能直接使用 PrismaClient
// 我們需要通過 API 調用來處理資料庫查詢
async function getMappingData(hash: string, baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/api/mapping/${hash}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Smart-Router-Middleware",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Middleware: 查詢映射資料錯誤:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // 只處理根路徑的 hash 請求，避免處理 /api、/_next 等路徑
  const hashMatch = pathname.match(/^\/([a-zA-Z0-9_-]{5,11})$/);

  if (!hashMatch) {
    return NextResponse.next();
  }

  const hash = hashMatch[1];

  // 驗證 hash 格式
  if (!isValidHash(hash)) {
    return NextResponse.next();
  }

  console.log("Middleware: 處理智能路由", { hash, pathname });

  // 獲取 Accept Header 和 User-Agent
  const acceptHeader = request.headers.get("accept") || "";
  const userAgent = request.headers.get("user-agent") || "";

  // 檢查 URL 參數
  const directParam = request.nextUrl.searchParams.get("direct");

  // 檢查是否為直接圖片請求
  const isDirectImageRequest = directParam === "true";

  // 檢查是否為圖片請求
  const isImageRequest =
    acceptHeader.includes("image/") ||
    (acceptHeader.includes("*/*") &&
      userAgent.toLowerCase().includes("image")) ||
    isDirectImageRequest;

  // 檢查是否為瀏覽器請求預覽頁
  const isBrowserRequest =
    acceptHeader.includes("text/html") && !isImageRequest;

  console.log("Middleware: 智能路由判斷", {
    hash,
    acceptHeader,
    userAgent: userAgent.substring(0, 50),
    isImageRequest,
    isBrowserRequest,
    directParam,
  });

  // 如果是 API 請求，讓它通過到 API 路由
  if (!isImageRequest && !isBrowserRequest) {
    console.log("Middleware: 轉發到 API 路由");
    return NextResponse.next();
  }

  // 查詢映射資料
  const mapping = await getMappingData(hash, origin);

  if (!mapping || mapping.error) {
    console.log("Middleware: 映射不存在，轉發到頁面路由");
    return NextResponse.next();
  }

  // 檢查是否過期
  if (mapping.expiresAt && new Date(mapping.expiresAt) < new Date()) {
    console.log("Middleware: 連結已過期");
    return NextResponse.next();
  }

  // 如果是圖片請求，直接重定向到圖片 URL
  if (isImageRequest && mapping.url) {
    console.log(`Middleware: 直接重定向到圖片: ${mapping.url}`);
    return NextResponse.redirect(mapping.url, { status: 302 });
  }

  // 如果是瀏覽器請求，重定向到預覽頁面
  if (isBrowserRequest) {
    const previewUrl = `${origin}/${hash}/p`;
    console.log(`Middleware: 重定向到預覽頁: ${previewUrl}`);
    return NextResponse.redirect(previewUrl, { status: 302 });
  }

  // 其他情況，讓請求繼續到原路由
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路徑除了：
     * - api 路由 (以 /api 開頭)
     * - _next/static (靜態文件)
     * - _next/image (圖片優化)
     * - favicon.ico (網站圖標)
     * - 已知的靜態文件擴展名
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)$).*)",
  ],
};
