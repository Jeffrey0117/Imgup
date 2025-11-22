import { NextRequest, NextResponse } from "next/server";

/**
 * 圖片代理 API - 解決防外連問題
 *
 * 當外部圖片網址有 referrer 限制時，通過服務器端轉發來繞過
 *
 * 使用方式：
 * /api/proxy-image?url=https://example.com/image.jpg
 *
 * 安全措施：
 * 1. Referer 白名單檢查（只允許來自 duk.tw 和 localhost 的請求）
 * 2. User-Agent 黑名單（阻擋爬蟲和機器人）
 * 3. Rate Limiting（每 IP 每分鐘最多 30 次請求）
 */

// User-Agent 黑名單（常見爬蟲和機器人）
const BLOCKED_USER_AGENTS = [
  'ccbot',
  'gptbot',
  'amazonbot',
  'bytespider',
  'python-requests',
  'python-urllib',
  'curl/',
  'wget/',
  'go-http-client',
  'scrapy',
  'java/',
  'bot',
  'spider',
  'crawler',
  'scraper',
  'slurp',
  'bingbot',
  'googlebot',
  'baiduspider',
  'yandexbot',
];

// Referer 白名單
const ALLOWED_REFERERS = [
  'duk.tw',
  'localhost',
  '127.0.0.1',
];

// 簡易 Rate Limiting（記憶體版本）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    // 重置或創建新的限制記錄
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + 60000, // 1 分鐘後重置
    });
    return true;
  }

  if (limit.count >= 30) {
    // 超過每分鐘 30 次限制
    return false;
  }

  limit.count++;
  return true;
}

// 定期清理過期的 rate limit 記錄（每 5 分鐘）
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((limit, ip) => {
    if (now > limit.resetTime) {
      rateLimitMap.delete(ip);
    }
  });
}, 300000);

export async function GET(request: NextRequest) {
  try {
    // === 安全檢查 1: Referer 驗證 ===
    const referer = request.headers.get('referer') || request.headers.get('referrer');

    if (!referer) {
      return NextResponse.json(
        { error: 'Access denied: No referer header' },
        { status: 403 }
      );
    }

    const isAllowedReferer = ALLOWED_REFERERS.some(allowed =>
      referer.toLowerCase().includes(allowed.toLowerCase())
    );

    if (!isAllowedReferer) {
      console.log(`Blocked referer: ${referer}`);
      return NextResponse.json(
        { error: 'Access denied: Invalid referer' },
        { status: 403 }
      );
    }

    // === 安全檢查 2: User-Agent 黑名單 ===
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();

    const isBlockedUA = BLOCKED_USER_AGENTS.some(blocked =>
      userAgent.includes(blocked)
    );

    if (isBlockedUA) {
      console.log(`Blocked User-Agent: ${userAgent}`);
      return NextResponse.json(
        { error: 'Access denied: Blocked user agent' },
        { status: 403 }
      );
    }

    // === 安全檢查 3: Rate Limiting ===
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (!checkRateLimit(ip)) {
      console.log(`Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // === 原有邏輯：處理圖片代理 ===
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 }
      );
    }

    // 驗證 URL 格式
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // 安全檢查：只允許 http/https 協議
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP/HTTPS protocols are allowed" },
        { status: 400 }
      );
    }

    // 從原始 URL 獲取圖片
    const response = await fetch(imageUrl, {
      headers: {
        // 移除 referrer，模擬直接訪問
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      // 設置超時
      signal: AbortSignal.timeout(10000), // 10 秒超時
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    // 獲取圖片數據
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // 返回圖片，設置適當的緩存頭
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // 緩存 24 小時
        "Access-Control-Allow-Origin": referer.includes('localhost')
          ? referer
          : "https://duk.tw", // 只允許來自 duk.tw 的跨域請求
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (error) {
    console.error("圖片代理錯誤:", error);

    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Image fetch timeout" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Failed to proxy image" },
      { status: 500 }
    );
  }
}
