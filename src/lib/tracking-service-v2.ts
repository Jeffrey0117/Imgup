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
    console.log('[Tracking-v2] REDIS_URL not configured, using fallback mode');
    return;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redis.on('error', (error) => {
      console.log('[Tracking-v2] Redis connection failed, falling back to local mode');
      if (redis) {
        redis.disconnect();
        redis = null;
      }
      redisConnectionAttempted = false;
    });

    redis.on('connect', () => {
      console.log('[Tracking-v2] Redis connected successfully');
    });

    redis.on('ready', () => {
      console.log('[Tracking-v2] Redis ready for commands');
    });

  } catch (error) {
    console.log('[Tracking-v2] Redis initialization failed, using fallback mode');
    redis = null;
  }
}

// 初始化 Redis
initializeRedis();

// Redis key 前綴
const REDIS_PREFIX = 'upimg:v2';
const VIEWS_KEY = (hash: string) => `${REDIS_PREFIX}:views:${hash}`;
const REFERRER_ZSET_KEY = (hash: string) => `${REDIS_PREFIX}:referrers:${hash}`;
const ACCESS_LOG_STREAM = (hash: string) => `${REDIS_PREFIX}:accesslog:${hash}`;
const PENDING_SYNC_KEY = `${REDIS_PREFIX}:pending_sync`;
const ACTIVE_HASHES_SET = `${REDIS_PREFIX}:active_hashes`;

export interface TrackingData {
  hash: string;
  referer?: string;
  userAgent?: string;
  ipAddress?: string;
  accessType?: 'direct' | 'referer' | 'api' | 'preview';
  clientType?: 'browser' | 'api' | 'crawler' | 'unknown';
  country?: string;
  region?: string;
}

export interface AccessLogEntry {
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  accessType?: string;
  clientType?: string;
  country?: string;
  region?: string;
}

/**
 * 優化版追蹤服務 v2
 *
 * 主要優化：
 * 1. 移除 AccessLog 表寫入，改用 Redis Streams（自動過期 30 天）
 * 2. viewCount 完全依賴 Redis，僅提供快照備份功能
 * 3. ReferrerStats 改用 Redis Sorted Sets（更高效）
 * 4. 優雅降級機制：Redis 故障時從 DB 讀取快照數據
 */
export class TrackingServiceV2 {
  private isConnected = false;

  constructor() {
    this.checkRedisConnection();
  }

  private checkRedisConnection() {
    this.isConnected = redis !== null;
    if (this.isConnected && redis) {
      redis.ping().then(() => {
        console.log('[Tracking-v2] Redis 追蹤服務連線成功');
      }).catch(() => {
        this.isConnected = false;
        console.log('[Tracking-v2] Redis 連線失敗，將使用降級模式');
      });
    }
  }

  /**
   * 完整追蹤記錄（整合所有追蹤邏輯）
   * @param data 追蹤資料
   */
  async track(data: TrackingData): Promise<void> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      console.log('[Tracking-v2] Redis 不可用，跳過追蹤');
      return;
    }

    try {
      const pipeline = redis.pipeline();

      // 1. 增加瀏覽次數（替代 DB 的 viewCount）
      pipeline.incr(VIEWS_KEY(data.hash));

      // 2. 記錄外連來源到 Sorted Set（替代 ReferrerStats 表）
      if (data.referer) {
        const domain = this.extractDomain(data.referer);
        if (domain) {
          // 使用 ZINCRBY：若 domain 不存在則創建並設為 1，否則 +1
          pipeline.zincrby(REFERRER_ZSET_KEY(data.hash), 1, domain);
        }
      }

      // 3. 記錄訪問日誌到 Redis Stream（替代 AccessLog 表）
      const logEntry: Record<string, string> = {
        timestamp: Date.now().toString(),
        ip: data.ipAddress || 'unknown',
        ua: data.userAgent || 'unknown',
        referer: data.referer || 'direct',
        accessType: data.accessType || 'direct',
        clientType: data.clientType || 'unknown',
      };

      if (data.country) logEntry.country = data.country;
      if (data.region) logEntry.region = data.region;

      // XADD：添加到 Stream，MAXLEN ~ 10000 限制最多保留 10000 條記錄
      pipeline.xadd(
        ACCESS_LOG_STREAM(data.hash),
        'MAXLEN', '~', '10000',
        '*', // 自動生成 ID
        ...Object.entries(logEntry).flat()
      );

      // 4. 標記為活躍的 hash（用於快照備份）
      pipeline.sadd(ACTIVE_HASHES_SET, data.hash);

      // 5. 為 Access Log Stream 設定過期時間（30 天）
      pipeline.expire(ACCESS_LOG_STREAM(data.hash), 30 * 24 * 60 * 60);

      await pipeline.exec();

      console.log(`[Tracking-v2] 追蹤記錄成功: ${data.hash}`, {
        referer: data.referer,
        accessType: data.accessType,
      });

    } catch (error) {
      console.error('[Tracking-v2] 追蹤失敗:', error);
      this.isConnected = false;
    }
  }

  /**
   * 取得瀏覽次數（優先從 Redis，失敗時從 DB 快照讀取）
   * @param hash 圖片 hash
   * @param dbFallback 可選的 DB 降級函數
   * @returns 瀏覽次數
   */
  async getViewCount(
    hash: string,
    dbFallback?: () => Promise<number>
  ): Promise<number> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      // Redis 不可用，使用降級模式
      if (dbFallback) {
        console.log(`[Tracking-v2] Redis 不可用，從 DB 讀取快照: ${hash}`);
        return await dbFallback();
      }
      return 0;
    }

    try {
      const count = await redis.get(VIEWS_KEY(hash));
      return parseInt(count || '0', 10);
    } catch (error) {
      console.error('[Tracking-v2] 讀取瀏覽次數失敗:', error);
      this.isConnected = false;

      // 降級到 DB
      if (dbFallback) {
        return await dbFallback();
      }
      return 0;
    }
  }

  /**
   * 取得外連統計（使用 Sorted Set）
   * @param hash 圖片 hash
   * @param limit 限制返回數量（默認 100）
   * @returns 外連統計，格式為 { domain: count, ... }
   */
  async getReferrerStats(
    hash: string,
    limit: number = 100
  ): Promise<Record<string, number>> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      return {};
    }

    try {
      // 使用 ZREVRANGE 取得前 N 個來源（按訪問量排序）
      const results = await redis.zrevrange(
        REFERRER_ZSET_KEY(hash),
        0,
        limit - 1,
        'WITHSCORES'
      );

      const stats: Record<string, number> = {};

      // 結果格式：[domain1, score1, domain2, score2, ...]
      for (let i = 0; i < results.length; i += 2) {
        const domain = results[i];
        const count = parseInt(results[i + 1] || '0', 10);
        stats[domain] = count;
      }

      return stats;
    } catch (error) {
      console.error('[Tracking-v2] 讀取外連統計失敗:', error);
      this.isConnected = false;
      return {};
    }
  }

  /**
   * 取得訪問日誌（從 Redis Stream 讀取）
   * @param hash 圖片 hash
   * @param count 取得數量（默認 50）
   * @returns 訪問日誌陣列
   */
  async getAccessLogs(
    hash: string,
    count: number = 50
  ): Promise<AccessLogEntry[]> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      return [];
    }

    try {
      // 使用 XREVRANGE 取得最近的 N 條記錄（倒序）
      const results = await redis.xrevrange(
        ACCESS_LOG_STREAM(hash),
        '+', // 最新
        '-', // 最舊
        'COUNT',
        count
      );

      const logs: AccessLogEntry[] = [];

      for (const [id, fields] of results) {
        const log: AccessLogEntry = {
          timestamp: Date.now(), // 默認值
        };

        // 解析欄位
        for (let i = 0; i < fields.length; i += 2) {
          const key = fields[i];
          const value = fields[i + 1];

          switch (key) {
            case 'timestamp':
              log.timestamp = parseInt(value);
              break;
            case 'ip':
              log.ipAddress = value;
              break;
            case 'ua':
              log.userAgent = value;
              break;
            case 'referer':
              log.referer = value;
              break;
            case 'accessType':
              log.accessType = value;
              break;
            case 'clientType':
              log.clientType = value;
              break;
            case 'country':
              log.country = value;
              break;
            case 'region':
              log.region = value;
              break;
          }
        }

        logs.push(log);
      }

      return logs;
    } catch (error) {
      console.error('[Tracking-v2] 讀取訪問日誌失敗:', error);
      this.isConnected = false;
      return [];
    }
  }

  /**
   * 每日快照備份（定時任務使用）
   * 將 Redis 中的統計數據快照到 DB，不清空 Redis
   * @returns 備份的 hash 數量
   */
  async createDailySnapshot(): Promise<number> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      console.log('[Tracking-v2] Redis 不可用，無法創建快照');
      return 0;
    }

    try {
      // 取得所有活躍的 hash
      const activeHashes = await redis.smembers(ACTIVE_HASHES_SET);

      if (activeHashes.length === 0) {
        console.log('[Tracking-v2] 無活躍 hash，跳過快照');
        return 0;
      }

      // 動態導入 Prisma
      const { default: prisma } = await import('./prisma');

      let snapshotCount = 0;

      console.log(`[Tracking-v2] 開始快照 ${activeHashes.length} 個 hash...`);

      for (const hash of activeHashes) {
        try {
          // 取得 Redis 中的瀏覽次數
          const viewCount = await this.getViewCount(hash);

          // 檢查 Mapping 是否存在
          const mapping = await prisma.mapping.findUnique({
            where: { hash }
          });

          if (!mapping) {
            console.warn(`[Tracking-v2] Mapping ${hash} 不存在，跳過快照`);
            // 清理無效的 hash
            await redis.srem(ACTIVE_HASHES_SET, hash);
            continue;
          }

          // 僅更新 viewCount 作為快照（不清空 Redis）
          if (viewCount > 0) {
            await prisma.mapping.update({
              where: { hash },
              data: {
                viewCount: viewCount  // 這是快照值，實際數據仍在 Redis
              }
            });
          }

          // 可選：同步 ReferrerStats（如果需要在 DB 中保留）
          const referrerStats = await this.getReferrerStats(hash, 50);

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

          snapshotCount++;

        } catch (error) {
          console.error(`[Tracking-v2] 快照 ${hash} 失敗:`, error);
        }
      }

      console.log(`[Tracking-v2] 快照完成: ${snapshotCount}/${activeHashes.length}`);
      return snapshotCount;

    } catch (error) {
      console.error('[Tracking-v2] 創建快照失敗:', error);
      this.isConnected = false;
      return 0;
    }
  }

  /**
   * 從 URL 提取域名
   */
  private extractDomain(url: string): string | null {
    try {
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
   * 健康檢查
   */
  async healthCheck(): Promise<{
    redis: boolean;
    activeHashesCount: number;
  }> {
    if (!this.isConnected || !redis || redis.status !== 'ready') {
      return { redis: false, activeHashesCount: 0 };
    }

    try {
      await redis.ping();
      const activeCount = await redis.scard(ACTIVE_HASHES_SET);
      return { redis: true, activeHashesCount: activeCount };
    } catch (error) {
      this.isConnected = false;
      return { redis: false, activeHashesCount: 0 };
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
}

// 導出單例實例
export const trackingServiceV2 = new TrackingServiceV2();
