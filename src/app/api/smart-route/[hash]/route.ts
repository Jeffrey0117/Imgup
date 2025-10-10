import { NextRequest, NextResponse } from "next/server";
import { createClient, RedisClientType } from 'redis';
import prisma from '@/lib/prisma';
import {
  EnhancedImageAccess,
  RedisCacheProvider,
  MemoryCacheProvider,
  StatsManager,
  ImageAccessRequest,
  ImageMapping,
  EdgeDetector
} from "@/lib/unified-access";
import { trackingService, TrackingData } from "@/lib/tracking-service";

// 初始化 Redis 客戶端（用於快取和統計）
let redisClient: RedisClientType | null = null;
let cacheProvider: RedisCacheProvider | MemoryCacheProvider = new MemoryCacheProvider();
let statsManager: StatsManager | null = null;
let cacheInitialized = false;
let cacheInitPromise: Promise<void> | null = null;

// 初始化快取提供者
async function initializeCache() {
  if (cacheInitialized) return;
  
  if (process.env.REDIS_URL) {
    try {
      // 取得 Redis URL 並檢查是否為 Upstash
      const redisUrl = process.env.REDIS_URL;
      const isUpstash = redisUrl.includes('upstash.io');
      
      // 如果是 Upstash，確保使用 TLS（rediss://）
      const finalUrl = isUpstash && redisUrl.startsWith('redis://')
        ? redisUrl.replace('redis://', 'rediss://')
        : redisUrl;

      // 建立 Redis 客戶端配置
      const clientConfig: any = {
        url: finalUrl,
        password: process.env.REDIS_PASSWORD,
        socket: {
          connectTimeout: 60000,
          reconnectStrategy: (retries: number) => {
            if (retries > 10) return false;
            const delay = Math.min(retries * 100, 3000);
            const jitter = Math.floor(Math.random() * 200);
            return delay + jitter;
          }
        }
      };

      // 如果是 Upstash，添加 TLS 配置
      if (isUpstash) {
        clientConfig.socket.tls = true;
        clientConfig.socket.rejectUnauthorized = false;
        console.log('Configuring Upstash Redis with TLS...');
      }

      redisClient = createClient(clientConfig);
      
      await redisClient.connect();
      console.log('Redis 連接成功，使用 Redis 快取');
      
      cacheProvider = new RedisCacheProvider({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'upimg:',
        defaultTTL: parseInt(process.env.REDIS_CACHE_TTL || '86400') // 24小時
      });
      
      statsManager = new StatsManager(redisClient, 'upimg:stats:');
    } catch (error) {
      console.error('Redis 連接失敗，降級到記憶體快取:', error);
      cacheProvider = new MemoryCacheProvider();
    }
  } else {
    console.log('未設定 Redis，使用記憶體快取');
    cacheProvider = new MemoryCacheProvider();
  }
  
  cacheInitialized = true;
}

// 確保快取初始化的函數
async function ensureCacheInitialized() {
  if (!cacheInitPromise) {
    cacheInitPromise = initializeCache();
  }
  await cacheInitPromise;
}

// 資料來源提供者 - 橋接 Prisma
const prismaDataProvider = async (hash: string): Promise<ImageMapping | null> => {
  try {
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
    });

    if (!mapping) return null;

    return {
      id: mapping.hash,
      url: mapping.url,
      filename: mapping.filename || '',
      fileExtension: (mapping as any).fileExtension,
      createdAt: mapping.createdAt,
      expiresAt: mapping.expiresAt ?? undefined,
      password: mapping.password ?? undefined,
      shortUrl: mapping.shortUrl,
    };
  } catch (error) {
    console.error('Prisma data provider error:', error);
    return null;
  }
};

// 統計提供者
const statsProvider = async (hash: string): Promise<void> => {
  if (statsManager) {
    await statsManager.recordAccess(hash);
  }
};

// 追蹤提供者（整合新的追蹤服務）
const trackingProvider = async (
  hash: string,
  request: ImageAccessRequest,
  responseType: string
): Promise<void> => {
  const edgeResult = EdgeDetector.detectEdge(request);
  
  const trackingData: TrackingData = {
    hash,
    referer: request.referer,
    userAgent: request.userAgent,
    ipAddress: request.ip,
    accessType: responseType === 'proxy' ? 'direct' :
               responseType === 'redirect' && request.hash.includes('/p') ? 'preview' :
               edgeResult.isApiRequest ? 'api' : 'direct',
    clientType: edgeResult.clientType
  };

  await trackingService.track(trackingData);
};

/** 具備超時與重試的抓取工具 */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeoutMs?: number; retries?: number; backoffMs?: number } = {}
) {
  const { timeoutMs = 8000, retries = 2, backoffMs = 300, ...rest } = options;
  let attempt = 0;
  let lastErr: any;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...rest, signal: controller.signal });
      clearTimeout(timer);
      if (res.status >= 500 && res.status < 600) {
        lastErr = new Error(`Upstream ${res.status}`);
        attempt++;
        if (attempt <= retries) await sleep(backoffMs * attempt);
        continue;
      }
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      lastErr = err;
      attempt++;
      if (attempt <= retries) await sleep(backoffMs * attempt);
    }
  }
  throw lastErr;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    // 確保快取已初始化
    await ensureCacheInitialized();
    
    // 初始化增強的統一存取服務
    const unifiedAccess = new EnhancedImageAccess(
      cacheProvider,
      prismaDataProvider,
      statsProvider,
      trackingProvider
    );
    
    const { hash: rawHash } = params;
    // 正規化：解碼並移除結尾空白/編碼空白，避免 `...png%20` 或 `...png ` 造成解析失敗
    const cleanedHash = decodeURIComponent(rawHash).replace(/(%20|\s|\+)+$/g, '');
    
    // 移除副檔名以查詢資料庫
    const hashWithoutExt = cleanedHash.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');
    const hasExtension = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(cleanedHash);

    // 建構統一請求物件
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const accessRequest: ImageAccessRequest = {
      hash: hashWithoutExt,
      headers,
      userAgent: headers['user-agent'] || headers['User-Agent'],
      referer: headers.referer || headers.Referer,
      ip: req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          'unknown'
    };

    console.log("Smart Route 統一介面請求:", {
      rawHash: cleanedHash,
      hashWithoutExt,
      hasExtension,
      userAgent: accessRequest.userAgent?.substring(0, 50),
      referer: accessRequest.referer?.substring(0, 50)
    });

    // 使用統一介面處理請求
    const response = await unifiedAccess.accessImage(accessRequest);

    // 🔒 檢查是否過期
    const mapping = response.data as ImageMapping | null;
    if (mapping?.expiresAt) {
      const expiryDate = new Date(mapping.expiresAt);
      const now = new Date();
      
      if (expiryDate < now) {
        // 圖片已過期，直接返回 410 Gone 避免重定向循環
        return NextResponse.json(
          {
            error: 'Link expired',
            message: '這個連結已經過期了',
            expiresAt: mapping.expiresAt
          },
          { status: 410 }
        );
      }
    }

    // 🔒 密碼保護邏輯（僅在非 proxy 模式下執行）
    // proxy 模式表示 unified-access 已決定允許直接存取（如 img 標籤嵌入）
    if (mapping?.password && response.type !== 'proxy') {
      const authCookie = req.cookies.get(`auth_${hashWithoutExt}`);
      const accept = req.headers.get('accept') || '';
      const isImageRequest = accept.includes('image/') || req.method === 'HEAD';
      
      console.log('[Smart Route] 密碼保護檢查:', {
        hasPassword: true,
        hasCookie: !!authCookie,
        isImageRequest,
        responseType: response.type,
        accept: accept.substring(0, 50)
      });
      
      if (isImageRequest) {
        // 論壇爬蟲或 <img> 嵌入：拒絕訪問
        console.log('[Smart Route] 論壇嵌入請求 - 拒絕有密碼的圖片');
        return new NextResponse('Protected image - password required', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-store'
          }
        });
      } else {
        // 瀏覽器訪問：檢查 cookie
        const referer = req.headers.get('referer') || '';
        const isFromPreviewPage = referer.includes(`/${hashWithoutExt}/p`);
        
        if (!authCookie || authCookie.value !== 'verified') {
          if (!isFromPreviewPage) {
            console.log('[Smart Route] 需要密碼驗證 - 導向預覽頁面');
            return NextResponse.redirect(new URL(`/${hashWithoutExt}/p`, req.url), {
              status: 302,
            });
          }
        }
      }
    }

    // 根據回應類型處理結果
    switch (response.type) {
      case 'redirect':
        if (response.url) {
          console.log(`Smart Route 重定向 (${response.statusCode}): ${response.url}`);
          
          // 手動建立重定向回應以支援自定義標頭
          const redirectResponse = new NextResponse(null, {
            status: response.statusCode || 302,
            headers: {
              'Location': response.url.startsWith('http')
                ? response.url
                : new URL(response.url, req.url).toString()
            }
          });
          
          // 添加快取控制標頭
          if (response.headers) {
            Object.entries(response.headers).forEach(([key, value]) => {
              redirectResponse.headers.set(key, value);
            });
          }
          
          return redirectResponse;
        }
        break;

      case 'proxy':
        // 代理模式：直接回傳圖片內容（帶超時與重試），失敗時回傳占位圖避免暴露來源
        if (response.url) {
          console.log('Smart Route 代理模式:', response.url);
          try {
            const imageResponse = await fetchWithRetry(response.url, { timeoutMs: 8000, retries: 2, backoffMs: 300 });

            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch image: ${imageResponse.status}`);
            }

            const responseHeaders = new Headers();

            // 加入快取控制標頭
            if (response.headers) {
              Object.entries(response.headers).forEach(([key, value]) => {
                responseHeaders.set(key, value);
              });
            }

            // 確保有 Content-Type
            if (!responseHeaders.has('Content-Type')) {
              const contentType = imageResponse.headers.get('Content-Type');
              if (contentType) responseHeaders.set('Content-Type', contentType);
              else responseHeaders.set('Content-Type', 'image/jpeg');
            }

            // 傳遞 Content-Length
            const contentLength = imageResponse.headers.get('Content-Length');
            if (contentLength) {
              responseHeaders.set('Content-Length', contentLength);
            }

            // 支援 Range
            if (imageResponse.headers.get('Accept-Ranges')) {
              responseHeaders.set('Accept-Ranges', 'bytes');
            }

            // 安全標頭
            responseHeaders.set('Referrer-Policy', 'no-referrer');
            responseHeaders.set('X-Content-Type-Options', 'nosniff');

            return new NextResponse(imageResponse.body, {
              status: 200,
              headers: responseHeaders
            });
          } catch (error) {
            console.error('代理圖片失敗，回傳占位圖避免暴露來源:', error);

            const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='120' height='60'>
  <rect width='100%' height='100%' fill='#f2f2f2'/>
  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#999' font-size='12'>image unavailable</text>
</svg>`;
            return new NextResponse(svg, {
              status: 502,
              headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'no-store',
                'Referrer-Policy': 'no-referrer',
                'X-Content-Type-Options': 'nosniff'
              }
            });
          }
        }
        break;

      case 'json':
        if (response.data) {
          console.log(`Smart Route 返回 JSON:`, response.data);
          return NextResponse.json(response.data, {
            status: response.statusCode || 200,
          });
        }
        break;

      case 'error':
        console.error('Smart Route 錯誤:', response);
        return NextResponse.redirect(new URL(`/${rawHash}`, req.url), {
          status: response.statusCode || 302,
        });
    }

    // 預設重定向到原路徑
    return NextResponse.redirect(new URL(`/${cleanedHash}`, req.url), {
      status: 302,
    });

  } catch (error) {
    console.error("Smart Route 統一介面錯誤:", error);
    // 發生錯誤時，重定向到原路由讓 Next.js 處理
    // 失敗時也嘗試使用正規化後的 hash
    const fallbackHash = decodeURIComponent(params.hash).replace(/(%20|\s|\+)+$/g, '');
    return NextResponse.redirect(new URL(`/${fallbackHash}`, req.url), {
      status: 302,
    });
  }
}

// Note: 清理函式已移除，因為 Next.js Route API 不允許自定義導出
// Prisma 使用單例模式會自動管理連線
