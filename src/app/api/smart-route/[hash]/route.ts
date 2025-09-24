import { NextRequest, NextResponse } from "next/server";
import { createClient, RedisClientType } from 'redis';
import prisma from '@/lib/prisma';
import {
  EnhancedImageAccess,
  RedisCacheProvider,
  MemoryCacheProvider,
  StatsManager,
  ImageAccessRequest,
  ImageMapping
} from "@/lib/unified-access";

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
      statsProvider
    );
    
    const { hash: rawHash } = params;

    // 建構統一請求物件
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const accessRequest: ImageAccessRequest = {
      hash: rawHash,
      headers,
      userAgent: headers['user-agent'] || headers['User-Agent'],
      referer: headers.referer || headers.Referer,
      ip: req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          'unknown'
    };

    console.log("Smart Route 統一介面請求:", {
      rawHash,
      userAgent: accessRequest.userAgent?.substring(0, 50),
      referer: accessRequest.referer?.substring(0, 50)
    });

    // 使用統一介面處理請求
    const response = await unifiedAccess.accessImage(accessRequest);

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
    return NextResponse.redirect(new URL(`/${rawHash}`, req.url), {
      status: 302,
    });

  } catch (error) {
    console.error("Smart Route 統一介面錯誤:", error);
    // 發生錯誤時，重定向到原路由讓 Next.js 處理
    return NextResponse.redirect(new URL(`/${params.hash}`, req.url), {
      status: 302,
    });
  }
}

// Note: 清理函式已移除，因為 Next.js Route API 不允許自定義導出
// Prisma 使用單例模式會自動管理連線