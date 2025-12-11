/**
 * Cloudflare Worker - duk.tw 圖片代理服務 v5
 *
 * 🚀 超高速版本 + 智慧路由
 *
 * 支援三種模式：
 * 1. R2 直接讀取（最省錢）: mapping URL 為 r2://key 時直接從 R2 讀取
 * 2. Hash 模式（隱藏 URL）: https://i.duk.tw/pbQyTD
 * 3. URL 模式（向後兼容）: https://i.duk.tw/image?url=xxx
 *
 * 🎯 智慧路由：
 * - 瀏覽器訪問 → 302 到預覽頁（賺廣告費）
 * - 論壇/curl/爬蟲 → 直接代理圖片
 *
 * 速度優化：Worker 直連 Neon，預估 TTFB < 200ms
 */

import { neon } from '@neondatabase/serverless';

// ===== 配置 =====
const ALLOWED_REFERERS = ['duk.tw', 'localhost', '127.0.0.1'];
const SITE_BASE_URL = 'https://duk.tw';

// 這些 UA 直接代理圖片（不導到預覽頁）
const DIRECT_PROXY_USER_AGENTS = [
  // 論壇/社群爬蟲（需要 embed 圖片）
  'discoursebot', 'facebookexternalhit', 'twitterbot', 'telegrambot',
  'whatsapp', 'slackbot', 'linkedinbot', 'discordbot', 'line-poker',
  // 開發工具
  'curl/', 'wget/', 'httpie', 'postman', 'insomnia',
  'python-requests', 'python-urllib', 'go-http-client',
  // RSS 閱讀器
  'feedly', 'feedparser',
];

// 這些 UA 完全封鎖
const BLOCKED_USER_AGENTS = [
  'ccbot', 'gptbot', 'amazonbot', 'bytespider',
  'scrapy', 'java/', 'spider', 'crawler', 'scraper',
  'slurp', 'bingbot', 'googlebot', 'baiduspider', 'yandexbot',
];
const RATE_LIMIT_PER_MINUTE = 30;

// ===== 類型定義 =====
interface Env {
  RATE_LIMIT_KV?: KVNamespace;
  MAPPING_KV?: KVNamespace;  // Mapping 緩存
  IMAGES_BUCKET?: R2Bucket;  // R2 圖片儲存
  DATABASE_URL: string;      // Neon PostgreSQL 連接字串
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

        // 🎯 智慧路由：判斷是瀏覽器還是爬蟲
        const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
        const accept = request.headers.get('accept') || '';
        const cleanHash = hash.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');

        // 判斷是否為瀏覽器請求
        const isBrowser = userAgent.includes('mozilla') &&
                          !DIRECT_PROXY_USER_AGENTS.some(ua => userAgent.includes(ua));

        // 判斷是否為圖片嵌入請求（Accept: image/*）
        const isImageEmbed = accept.startsWith('image/') ||
                             accept.includes('image/*') ||
                             !accept.includes('text/html');

        console.log('🎯 智慧路由判斷:', {
          isBrowser,
          isImageEmbed,
          userAgent: userAgent.substring(0, 50),
          accept: accept.substring(0, 50)
        });

        // 瀏覽器直接訪問（非圖片嵌入）→ 導到預覽頁
        if (isBrowser && !isImageEmbed) {
          const previewUrl = `${SITE_BASE_URL}/${cleanHash}/p`;
          console.log('🎯 瀏覽器訪問 → 導到預覽頁:', previewUrl);
          return Response.redirect(previewUrl, 302);
        }

        // 優先從 KV 緩存查詢（節省 Vercel API 調用）
        imageUrl = await fetchMappingWithKVCache(hash, env);
        if (!imageUrl) {
          return jsonResponse({ error: 'Hash not found or expired' }, 404);
        }

        console.log('✅ 映射查詢成功:', imageUrl.substring(0, 50));
      }

      // === 安全檢查 1: Referer（已移除驗證，允許所有來源）===
      // 完全開放圖片訪問，方便各種 APP 和工具使用
      const referer = request.headers.get('referer') || request.headers.get('referrer') || '';

      // === 安全檢查 2: User-Agent 黑名單（只在 URL 模式下檢查）===
      const userAgentCheck = (request.headers.get('user-agent') || '').toLowerCase();
      const isBlockedUA = BLOCKED_USER_AGENTS.some(blocked => userAgentCheck.includes(blocked));

      if (isBlockedUA) {
        console.log(`❌ Blocked User-Agent: ${userAgentCheck}`);
        return jsonResponse({ error: 'Access denied: Blocked user agent' }, 403);
      }

      // === 安全檢查 3: Rate Limiting ===
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';

      if (env.RATE_LIMIT_KV) {
        try {
          const rateLimitCheck = await checkRateLimit(ip, env.RATE_LIMIT_KV);
          if (!rateLimitCheck.allowed) {
            console.log(`❌ Rate limit exceeded for IP: ${ip}`);
            return jsonResponse(
              { error: 'Too many requests. Please try again later.' },
              429
            );
          }
        } catch (error) {
          // KV 限制超過時不影響主流程，僅記錄日誌
          console.warn('⚠️ Rate limiting 失敗（可能超過 KV 限制）:', error);
        }
      }

      // === 檢查是否為 R2 儲存 ===
      if (imageUrl.startsWith('r2://')) {
        // R2 直接讀取模式（最省錢，無外部請求）
        const r2Key = imageUrl.replace('r2://', '');
        console.log('🗄️ R2 模式:', r2Key);
        return await serveFromR2(r2Key, env, referer);
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

      // === 圖片代理處理（外部 URL）===
      return await proxyImage(imageUrl, request, ctx, referer);

    } catch (error) {
      console.error('❌ Worker 錯誤:', error);
      console.error('錯誤詳情:', error instanceof Error ? error.message : String(error));
      console.error('錯誤堆疊:', error instanceof Error ? error.stack : 'No stack trace');

      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          return jsonResponse({ error: 'Request timeout' }, 504);
        }
      }

      return jsonResponse({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  },
};

// ===== 輔助函數 =====

// Mapping KV 緩存 TTL（7 天，因為 mapping 很少變動）
const MAPPING_KV_TTL = 60 * 60 * 24 * 7;

// Content-Type 對照表
const CONTENT_TYPE_MAP: Record<string, string> = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'bmp': 'image/bmp',
  'ico': 'image/x-icon',
};

/**
 * 從檔名取得 Content-Type
 */
function getContentTypeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream';
}

/**
 * 從 R2 直接讀取圖片並回傳（零外部請求，最省錢）
 */
async function serveFromR2(key: string, env: Env, referer: string): Promise<Response> {
  if (!env.IMAGES_BUCKET) {
    console.error('❌ R2 bucket 未綁定');
    return jsonResponse({ error: 'Storage not configured' }, 500);
  }

  try {
    const object = await env.IMAGES_BUCKET.get(key);

    if (!object) {
      console.log(`❌ R2 找不到檔案: ${key}`);
      return jsonResponse({ error: 'Image not found' }, 404);
    }

    console.log(`✅ R2 讀取成功: ${key} (${object.size} bytes)`);

    // 從 R2 metadata 或檔名推斷 Content-Type
    const contentType = object.httpMetadata?.contentType || getContentTypeFromKey(key);

    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Length': String(object.size),
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 年快取（內容不變）
      'CDN-Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': referer.includes('localhost') ? referer : '*',
      'X-Content-Type-Options': 'nosniff',
      'X-Storage': 'r2', // 標記來源
      'ETag': object.etag,
    });

    // 如果有 uploaded 時間，加入 Last-Modified
    if (object.uploaded) {
      headers.set('Last-Modified', object.uploaded.toUTCString());
    }

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('❌ R2 讀取失敗:', error);
    return jsonResponse({
      error: 'Failed to read from storage',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}

/**
 * 🚀 超高速 mapping 查詢
 * 流程：KV 緩存 → Neon 直連（跳過 Vercel API）→ 寫回 KV
 */
async function fetchMappingWithKVCache(hash: string, env: Env): Promise<string | null> {
  const cleanHash = hash.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');
  const kvKey = `mapping:${cleanHash}`;

  // Step 1: 先查 KV 緩存（最快，~10ms）
  if (env.MAPPING_KV) {
    try {
      const cached = await env.MAPPING_KV.get(kvKey);
      if (cached) {
        console.log('💾 KV HIT:', cleanHash);
        return cached;
      }
      console.log('💾 KV MISS:', cleanHash);
    } catch (e) {
      console.warn('⚠️ KV 讀取失敗:', e);
    }
  }

  // Step 2: KV 沒有，直連 Neon 查詢（~50-100ms，比打 Vercel API 快 10 倍）
  const imageUrl = await fetchMappingFromNeon(cleanHash, env);

  // Step 3: 成功的話寫入 KV 緩存
  if (imageUrl && env.MAPPING_KV) {
    try {
      await env.MAPPING_KV.put(kvKey, imageUrl, { expirationTtl: MAPPING_KV_TTL });
      console.log('💾 KV SAVED:', cleanHash);
    } catch (e) {
      console.warn('⚠️ KV 寫入失敗:', e);
    }
  }

  return imageUrl;
}

/**
 * 🚀 直連 Neon PostgreSQL 查詢 mapping（超快，~50-100ms）
 */
async function fetchMappingFromNeon(hash: string, env: Env): Promise<string | null> {
  if (!env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 未設定');
    return null;
  }

  try {
    const sql = neon(env.DATABASE_URL);
    const startTime = Date.now();

    // 單一查詢，只取需要的欄位
    const result = await sql`
      SELECT url, "expiresAt", "isDeleted"
      FROM "Mapping"
      WHERE hash = ${hash}
      LIMIT 1
    `;

    const queryTime = Date.now() - startTime;
    console.log(`🚀 Neon 查詢耗時: ${queryTime}ms`);

    if (result.length === 0) {
      console.log(`❌ Hash 不存在: ${hash}`);
      return null;
    }

    const mapping = result[0];

    // 檢查是否已刪除
    if (mapping.isDeleted) {
      console.log(`❌ Mapping 已刪除: ${hash}`);
      return null;
    }

    // 檢查是否過期
    if (mapping.expiresAt && new Date(mapping.expiresAt) < new Date()) {
      console.log(`❌ Mapping 已過期: ${hash}`);
      return null;
    }

    return mapping.url;
  } catch (error) {
    console.error('❌ Neon 查詢失敗:', error);
    return null;
  }
}

/**
 * 從 Vercel API 查詢 hash 對應的真實 URL（備援，當 Neon 直連失敗時使用）
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
        cacheTtl: 86400, // 緩存 24 小時（配合 KV 緩存進一步減少 API 調用）
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
  const cacheKey = new Request(imageUrl);
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

/**
 * 🎯 直接在 Worker 渲染預覽頁（省 Vercel 費用）
 */
async function renderPreviewPage(hash: string, env: Env): Promise<Response> {
  // 查詢 mapping 資訊
  const mappingData = await fetchMappingDataFromNeon(hash, env);

  if (!mappingData) {
    return new Response(generate404HTML(), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 如果有密碼保護，重定向到 Vercel 處理
  if (mappingData.password) {
    return Response.redirect(`${SITE_BASE_URL}/${hash}/p`, 302);
  }

  // 生成預覽頁 HTML
  const html = generatePreviewHTML(hash, mappingData);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // 1 小時快取
    },
  });
}

/**
 * 從 Neon 查詢完整 mapping 資料（包含 filename 等）
 */
async function fetchMappingDataFromNeon(hash: string, env: Env): Promise<{
  url: string;
  filename: string;
  password: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  fileExtension: string | null;
} | null> {
  if (!env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 未設定');
    return null;
  }

  try {
    const sql = neon(env.DATABASE_URL);
    const result = await sql`
      SELECT url, filename, password, "createdAt", "expiresAt", "fileExtension", "isDeleted"
      FROM "Mapping"
      WHERE hash = ${hash}
      LIMIT 1
    `;

    if (result.length === 0) return null;

    const mapping = result[0];
    if (mapping.isDeleted) return null;
    if (mapping.expiresAt && new Date(mapping.expiresAt) < new Date()) return null;

    return {
      url: mapping.url,
      filename: mapping.filename || '',
      password: mapping.password,
      createdAt: new Date(mapping.createdAt),
      expiresAt: mapping.expiresAt ? new Date(mapping.expiresAt) : null,
      fileExtension: mapping.fileExtension,
    };
  } catch (error) {
    console.error('❌ Neon 查詢失敗:', error);
    return null;
  }
}

/**
 * 生成預覽頁 HTML
 */
function generatePreviewHTML(hash: string, data: {
  url: string;
  filename: string;
  fileExtension: string | null;
}): string {
  // 推導副檔名
  let ext = data.fileExtension || '';
  if (!ext && data.filename) {
    const match = data.filename.match(/\.([a-zA-Z0-9]+)$/);
    if (match) ext = match[1].toLowerCase();
  }

  const imageUrl = `https://i.duk.tw/${hash}${ext ? '.' + ext : ''}`;
  const pageUrl = `${SITE_BASE_URL}/${hash}/p`;
  const title = '圖鴨上床 duk.tw - 最好用的免費圖床';
  const description = '免費圖片分享，支援快速上傳，免註冊即可使用';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="duk.tw">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      color: #fff;
    }
    .container {
      max-width: 900px;
      width: 100%;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(10px);
      margin-top: 20px;
    }
    .image-wrapper {
      width: 100%;
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    .image-wrapper img {
      max-width: 100%;
      max-height: 70vh;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .info {
      background: rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #888; }
    .info-value { color: #fff; word-break: break-all; }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn {
      flex: 1;
      min-width: 120px;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      text-align: center;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); }
    .logo {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .logo span { color: #667eea; }
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #22c55e;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      display: none;
      z-index: 1000;
    }
    .ad-container {
      width: 100%;
      max-width: 900px;
      margin: 20px 0;
      min-height: 90px;
      background: rgba(255,255,255,0.02);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="logo">圖鴨<span>上床</span></div>

  <!-- 廣告位 -->
  <div class="ad-container">
    <!-- Google AdSense 或其他廣告代碼 -->
  </div>

  <div class="container">
    <div class="image-wrapper">
      <img src="${imageUrl}" alt="${data.filename || '分享圖片'}" loading="eager">
    </div>

    <div class="info">
      <div class="info-row">
        <span class="info-label">檔案名稱</span>
        <span class="info-value">${data.filename || '未命名'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">短網址</span>
        <span class="info-value">${SITE_BASE_URL}/${hash}</span>
      </div>
      <div class="info-row">
        <span class="info-label">直接連結</span>
        <span class="info-value">${imageUrl}</span>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" onclick="copyLink('${SITE_BASE_URL}/${hash}')">📋 複製短網址</button>
      <button class="btn btn-secondary" onclick="copyLink('${imageUrl}')">🔗 複製圖片連結</button>
      <a href="${imageUrl}" download class="btn btn-secondary">⬇️ 下載圖片</a>
      <a href="${SITE_BASE_URL}" class="btn btn-secondary">🏠 返回首頁</a>
    </div>
  </div>

  <div class="toast" id="toast">已複製到剪貼簿！</div>

  <script>
    function copyLink(text) {
      navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
      });
    }
  </script>
</body>
</html>`;
}

/**
 * 生成 404 頁面
 */
function generate404HTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>找不到圖片 - duk.tw</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    h1 { font-size: 72px; margin-bottom: 16px; }
    p { color: #888; margin-bottom: 24px; }
    a {
      color: #667eea;
      text-decoration: none;
      padding: 12px 24px;
      border: 1px solid #667eea;
      border-radius: 8px;
    }
    a:hover { background: #667eea; color: #fff; }
  </style>
</head>
<body>
  <h1>404</h1>
  <p>找不到這張圖片，可能已過期或被刪除</p>
  <a href="${SITE_BASE_URL}">返回首頁</a>
</body>
</html>`;
}
