import Redis from 'ioredis';

// Redis 實例（可選）
let redis: Redis | null = null;
let redisConnectionAttempted = false;

function initializeRedis() {
  if (redisConnectionAttempted) {
    return;
  }
  
  redisConnectionAttempted = true;
  
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('REDIS_URL not configured, using fallback mode');
    return;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    // 設定錯誤處理，避免未處理的錯誤事件
    redis.on('error', (error) => {
      console.log('Redis connection failed, falling back to local mode');
      if (redis) {
        redis.disconnect();
        redis = null;
      }
      redisConnectionAttempted = false; // 允許稍後重試
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redis.on('ready', () => {
      console.log('Redis ready for commands');
    });

  } catch (error) {
    console.log('Redis initialization failed, using fallback mode');
    redis = null;
  }
}

// 初始化 Redis（如果可用）
initializeRedis();

// Redis key 前綴
const REDIS_PREFIX = 'upimg';
const VIEWS_KEY = (hash: string) => `${REDIS_PREFIX}:views:${hash}`;
const REFERRER_KEY = (hash: string, domain: string) => `${REDIS_PREFIX}:referrers:${hash}:${domain}`;
const PENDING_SYNC_KEY = `${REDIS_PREFIX}:pending_sync`;

export interface TrackingData {
  hash: string;
  referer?: string;
  userAgent?: string;
  ipAddress?: string;
  accessType?: 'direct' | 'referer' | 'api' | 'preview';
  clientType?: 'browser' | 'api' | 'crawler' | 'unknown';
}

export class TrackingService {
  private isConnected = false;

  constructor() {
    this.checkRedisConnection();
  }

  private checkRedisConnection() {
    this.isConnected = redis !== null;
    if (this.isConnected && redis) {
      // 測試連線
      redis.ping().then(() => {
        console.log('Redis 追蹤服務連線成功');
      }).catch(() => {
        this.isConnected = false;
        console.log('Redis 連線失敗，將使用降級模式');
      });
    }
  }

  /**
   * 增加瀏覽次數
   * @param hash 圖片 hash
   * @returns 新的瀏覽次數，如果 Redis 不可用則返回 null
   */
  async incrementViewCount(hash: string): Promise<number | null> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      return null;
    }

    try {
      // 原子性增加瀏覽次數
      const pipeline = redis.pipeline();
      pipeline.incr(VIEWS_KEY(hash));
      pipeline.sadd(PENDING_SYNC_KEY, hash); // 標記為待同步
      
      const results = await pipeline.exec();
      
      if (results && results[0] && results[0][1]) {
        return results[0][1] as number;
      }
      
      return null;
    } catch (error) {
      // 靜默處理錯誤
      this.isConnected = false;
      return null;
    }
  }

  /**
   * 記錄外連來源
   * @param hash 圖片 hash
   * @param referer 來源 URL
   */
  async trackReferrer(hash: string, referer: string | null): Promise<void> {
    if (!this.isConnected || !redis || redis.status !== 'ready' || !referer) {
      return;
    }

    try {
      const domain = this.extractDomain(referer);
      if (!domain) return;

      const pipeline = redis.pipeline();
      pipeline.incr(REFERRER_KEY(hash, domain));
      pipeline.sadd(PENDING_SYNC_KEY, hash);
      
      await pipeline.exec();
    } catch (error) {
      // 靜默處理錯誤
      this.isConnected = false;
    }
  }

  /**
   * 完整追蹤記錄（整合瀏覽次數和外連來源）
   * @param data 追蹤資料
   */
  async track(data: TrackingData): Promise<void> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      return;
    }

    try {
      const pipeline = redis.pipeline();
      
      // 增加瀏覽次數
      pipeline.incr(VIEWS_KEY(data.hash));
      
      // 記錄外連來源
      if (data.referer) {
        const domain = this.extractDomain(data.referer);
        if (domain) {
          pipeline.incr(REFERRER_KEY(data.hash, domain));
        }
      }
      
      // 標記為待同步
      pipeline.sadd(PENDING_SYNC_KEY, data.hash);
      
      await pipeline.exec();
      
      console.log(`追蹤記錄成功: ${data.hash}`, {
        referer: data.referer,
        accessType: data.accessType,
        clientType: data.clientType
      });
      
    } catch (error) {
      // 靜默處理錯誤
      this.isConnected = false;
    }
  }

  /**
   * 取得瀏覽次數
   * @param hash 圖片 hash
   * @returns 瀏覽次數，如果不存在或 Redis 不可用則返回 0
   */
  async getViewCount(hash: string): Promise<number> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      return 0;
    }

    try {
      const count = await redis.get(VIEWS_KEY(hash));
      return parseInt(count || '0', 10);
    } catch (error) {
      // 靜默處理錯誤
      this.isConnected = false;
      return 0;
    }
  }

  /**
   * 取得外連統計
   * @param hash 圖片 hash
   * @returns 外連統計，格式為 { domain: count, ... }
   */
  async getReferrerStats(hash: string): Promise<Record<string, number>> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      return {};
    }

    try {
      const pattern = REFERRER_KEY(hash, '*');
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        return {};
      }

      const values = await redis.mget(...keys);
      const stats: Record<string, number> = {};

      keys.forEach((key, index) => {
        const domain = key.split(':').pop();
        if (domain && values[index]) {
          stats[domain] = parseInt(values[index] || '0', 10);
        }
      });

      return stats;
    } catch (error) {
      // 靜默處理錯誤
      this.isConnected = false;
      return {};
    }
  }

  /**
   * 批次同步到資料庫
   * @returns 同步的 hash 數量
   */
  async syncToDatabase(): Promise<number> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      return 0;
    }

    try {
      // 取得所有待同步的 hash
      const pendingHashes = await redis.smembers(PENDING_SYNC_KEY);
      
      if (pendingHashes.length === 0) {
        return 0;
      }

      // 動態導入 Prisma 避免循環依賴
      const { default: prisma } = await import('./prisma');
      
      let syncedCount = 0;

      for (const hash of pendingHashes) {
        try {
          // 取得 Redis 中的瀏覽次數
          const viewCount = await this.getViewCount(hash);
          
          // 取得外連統計
          const referrerStats = await this.getReferrerStats(hash);

          // 檢查 Mapping 是否存在
          const mapping = await prisma.mapping.findUnique({
            where: { hash }
          });

          if (!mapping) {
            console.warn(`Mapping ${hash} 不存在，跳過同步`);
            await redis.srem(PENDING_SYNC_KEY, hash);
            continue;
          }

          // 更新 Mapping 表的瀏覽次數
          if (viewCount > 0) {
            await prisma.mapping.update({
              where: { hash },
              data: { viewCount }
            });
          }

          // 更新或創建外連統計
          for (const [domain, count] of Object.entries(referrerStats)) {
            if (count > 0) {
              await prisma.referrerStats.upsert({
                where: {
                  mappingId_refererDomain: {
                    mappingId: mapping.id,
                    refererDomain: domain
                  }
                },
                update: {
                  accessCount: count,
                  lastAccessAt: new Date()
                },
                create: {
                  mappingId: mapping.id,
                  refererDomain: domain,
                  accessCount: count
                }
              });
            }
          }

          // 從待同步列表中移除
          await redis.srem(PENDING_SYNC_KEY, hash);
          syncedCount++;
          
        } catch (error) {
          console.error(`同步 ${hash} 失敗:`, error);
          // 繼續同步其他項目
        }
      }

      console.log(`成功同步 ${syncedCount} 個項目到資料庫`);
      return syncedCount;
      
    } catch (error) {
      // 靜默處理錯誤
      this.isConnected = false;
      return 0;
    }
  }

  /**
   * 從 URL 提取域名
   * @param url 完整 URL
   * @returns 域名，如果無法提取則返回 null
   */
  private extractDomain(url: string): string | null {
    try {
      // 如果不是完整 URL，嘗試補充 protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  /**
   * 取得連接狀態
   */
  isRedisConnected(): boolean {
    return this.isConnected && redis !== null && redis.status === 'ready';
  }

  /**
   * 關閉 Redis 連接
   */
  async close(): Promise<void> {
    if (this.isConnected && redis) {
      try {
        await redis.quit();
      } catch (error) {
        // 靜默處理關閉錯誤
      }
      this.isConnected = false;
    }
  }

  /**
   * 健康檢查
   */
  async healthCheck(): Promise<{ redis: boolean; pendingSyncCount: number }> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      return { redis: false, pendingSyncCount: 0 };
    }

    try {
      await redis.ping();
      const pendingCount = await redis.scard(PENDING_SYNC_KEY);
      return { redis: true, pendingSyncCount: pendingCount };
    } catch (error) {
      // 靜默處理錯誤
      this.isConnected = false;
      return { redis: false, pendingSyncCount: 0 };
    }
  }
}

// 導出單例實例
export const trackingService = new TrackingService();