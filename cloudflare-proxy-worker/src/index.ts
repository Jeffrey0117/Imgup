/**
 * Cloudflare Worker - duk.tw 圖片代理服務 v2
 *
 * 🎯 完美隱藏原始 URL + 節省 99% 成本
 *
 * 支援兩種模式：
 * 1. Hash 模式（隱藏 URL）: https://proxy.duk.tw/pbQyTD
 * 2. URL 模式（向後兼容）: https://proxy.duk.tw/image?url=xxx
 *
 * 預期節省：$498/月 → < $5/月（節省 99%）
 */

// ===== 配置 =====
const API_BASE_URL = 'https://duk.tw'; // Vercel API 基礎 URL
const ALLOWED_REFERERS = ['duk.tw', 'localhost', '127.0.0.1'];
const BLOCKED_USER_AGENTS = [
  'ccbot', 'gptbot', 'amazonbot', 'bytespider',
  'python-requests', 'python-urllib', 'curl/', 'wget/',
  'go-http-client', 'scrapy', 'java/', 'bot', 'spider',
  'crawler', 'scraper', 'slurp', 'bingbot', 'googlebot',
  'baiduspider', 'yandexbot',
];
const RATE_LIMIT_PER_MINUTE = 30;

// ===== 類型定義 =====
interface Env {
  RATE_LIMIT_KV?: KVNamespace;
}

interface RateLimitData {
  count: number;
  resetTime: number;
}

interface MappingResponse {
  hash: string;
  url: string;
  filename?: string;
  error?: string;
}

// ===== 主要 Handler =====
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS 預檢請求
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // 只接受 GET 請求
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      // 判斷使用哪種模式
      let imageUrl: string;

      if (pathname === '/image' || pathname === '/image/') {
        // 模式 1：URL 參數模式（向後兼容）
        imageUrl = url.searchParams.get('url') || '';
        if (!imageUrl) {
          return jsonResponse({ error: 'Missing url parameter' }, 400);
        }
        console.log('📝 URL 模式:', imageUrl.substring(0, 50));
      } else {
        // 模式 2：Hash 模式（隱藏 URL）
        const hash = pathname.substring(1); // 移除開頭的 '/'

        if (!hash || hash === '' || hash === '/') {
          return jsonResponse({ error: 'Not found' }, 404);
        }

        console.log('🔍 Hash 模式:', hash);

        // 從 Vercel API 查詢映射
        imageUrl = await fetchMappingUrl(hash);
        if (!imageUrl) {
          return jsonResponse({ error: 'Hash not found or expired' }, 404);
        }

        console.log('✅ 映射查詢成功:', imageUrl.substring(0, 50));
      }

      // === 安全檢查 1: Referer 驗證（圖片嵌入請求放寬限制）===
      const accept = request.headers.get('accept') || '';
      const isImageEmbed = accept.includes('image/'); // <img> 標籤嵌入請求

      // 圖片嵌入（如 PTT、巴哈論壇）：跳過 Referer 驗證
      // 瀏覽器直接訪問：會在 smart-route 被攔截，不會到達這裡
      if (!isImageEmbed) {
        const referer = request.headers.get('referer') || request.headers.get('referrer') || '';

        if (!referer) {
          return jsonResponse({ error: 'Access denied: No referer header' }, 403);
        }

        const isAllowedReferer = ALLOWED_REFERERS.some(allowed =>
          referer.toLowerCase().includes(allowed.toLowerCase())
        );

        if (!isAllowedReferer) {
          console.log(`❌ Blocked referer: ${referer}`);
          return jsonResponse({ error: 'Access denied: Invalid referer' }, 403);
        }
      } else {
        console.log('✅ Image embed request - skipping referer check');
      }

      // === 安全檢查 2: User-Agent 黑名單 ===
      const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
      const isBlockedUA = BLOCKED_USER_AGENTS.some(blocked => userAgent.includes(blocked));

      if (isBlockedUA) {
        console.log(`❌ Blocked User-Agent: ${userAgent}`);
        return jsonResponse({ error: 'Access denied: Blocked user agent' }, 403);
      }

      // === 安全檢查 3: Rate Limiting ===
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';

      if (env.RATE_LIMIT_KV) {
        const rateLimitCheck = await checkRateLimit(ip, env.RATE_LIMIT_KV);
        if (!rateLimitCheck.allowed) {
          console.log(`❌ Rate limit exceeded for IP: ${ip}`);
          return jsonResponse(
            { error: 'Too many requests. Please try again later.' },
            429
          );
        }
      }

      // === 驗證 URL 格式 ===
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(imageUrl);
      } catch {
        return jsonResponse({ error: 'Invalid URL format' }, 400);
      }

      // 安全檢查：只允許 http/https 協議
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return jsonResponse({ error: 'Only HTTP/HTTPS protocols are allowed' }, 400);
      }

      // === 圖片代理處理 ===
      return await proxyImage(imageUrl, request, ctx, referer);

    } catch (error) {
      console.error('❌ Worker 錯誤:', error);

      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          return jsonResponse({ error: 'Request timeout' }, 504);
        }
      }

      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },
};

// ===== 輔助函數 =====

/**
 * 從 Vercel API 查詢 hash 對應的真實 URL
 */
async function fetchMappingUrl(hash: string): Promise<string | null> {
  try {
    // 移除副檔名（如果有）
    const cleanHash = hash.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');

    const apiUrl = `${API_BASE_URL}/api/mapping/${cleanHash}`;
    console.log('📡 調用 API:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      cf: {
        cacheTtl: 300, // 緩存 5 分鐘
      },
    });

    if (!response.ok) {
      console.error(`❌ API 錯誤: ${response.status}`);
      return null;
    }

    const data: MappingResponse = await response.json();

    if (data.error || !data.url) {
      console.error('❌ 映射不存在或已過期');
      return null;
    }

    return data.url;
  } catch (error) {
    console.error('❌ API 調用失敗:', error);
    return null;
  }
}

/**
 * 代理圖片
 */
async function proxyImage(
  imageUrl: string,
  request: Request,
  ctx: ExecutionContext,
  referer: string
): Promise<Response> {
  // 檢查 Cloudflare Cache
  const cache = caches.default;
  const cacheKey = new Request(imageUrl, request);
  let response = await cache.match(cacheKey);

  if (response) {
    console.log(`✅ Cache HIT: ${imageUrl.substring(0, 50)}`);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Cache-Status', 'HIT');
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }

  // 從原始 URL 獲取圖片
  console.log(`📥 Cache MISS, 正在獲取: ${imageUrl.substring(0, 50)}`);
  const imageResponse = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    },
    cf: {
      cacheTtl: 86400, // Cloudflare CDN 緩存 24 小時
      cacheEverything: true,
    },
  });

  if (!imageResponse.ok) {
    return jsonResponse(
      { error: `Failed to fetch image: ${imageResponse.status}` },
      imageResponse.status
    );
  }

  // 返回圖片，設置適當的緩存頭
  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400', // 瀏覽器緩存 24 小時
    'CDN-Cache-Control': 'public, max-age=31536000', // Cloudflare CDN 緩存 1 年
    'Access-Control-Allow-Origin': referer.includes('localhost') ? referer : 'https://duk.tw',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Cache-Status': 'MISS',
  });

  const finalResponse = new Response(imageResponse.body, {
    status: 200,
    headers,
  });

  // 存入 Cloudflare Cache
  ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));

  return finalResponse;
}

/**
 * Rate Limiting 檢查（使用 Cloudflare KV）
 */
async function checkRateLimit(ip: string, kv: KVNamespace): Promise<{ allowed: boolean }> {
  const now = Date.now();
  const key = `rate_limit:${ip}`;

  const data = await kv.get<RateLimitData>(key, 'json');

  if (!data || now > data.resetTime) {
    // 重置或創建新的限制記錄
    await kv.put(
      key,
      JSON.stringify({
        count: 1,
        resetTime: now + 60000, // 1 分鐘後重置
      }),
      { expirationTtl: 60 }
    );
    return { allowed: true };
  }

  if (data.count >= RATE_LIMIT_PER_MINUTE) {
    // 超過每分鐘限制
    return { allowed: false };
  }

  // 增加計數
  await kv.put(
    key,
    JSON.stringify({
      count: data.count + 1,
      resetTime: data.resetTime,
    }),
    { expirationTtl: 60 }
  );

  return { allowed: true };
}

/**
 * 處理 CORS 預檢請求
 */
function handleCORS(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * 返回 JSON 回應
 */
function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
