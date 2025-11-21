import { trackingServiceV2 } from './tracking-service-v2';

/**
 * ViewCount 輔助工具
 *
 * 提供統一的 viewCount 讀取接口，實現優雅降級機制
 */

export interface ViewCountResult {
  viewCount: number;
  source: 'redis' | 'db_snapshot' | 'db_fallback';
}

/**
 * 獲取單個短網址的瀏覽次數
 * 優先從 Redis 讀取，Redis 不可用時降級到 DB 快照
 *
 * @param hash 短網址 hash
 * @param dbSnapshot DB 中的快照值（可選）
 * @returns 瀏覽次數和數據來源
 */
export async function getViewCount(
  hash: string,
  dbSnapshot?: number
): Promise<ViewCountResult> {
  try {
    // 嘗試從 Redis 讀取
    const viewCount = await trackingServiceV2.getViewCount(
      hash,
      dbSnapshot !== undefined ? async () => dbSnapshot : undefined
    );

    // 判斷數據來源
    if (trackingServiceV2.isRedisConnected()) {
      return {
        viewCount,
        source: 'redis'
      };
    } else if (dbSnapshot !== undefined) {
      return {
        viewCount: dbSnapshot,
        source: 'db_snapshot'
      };
    } else {
      return {
        viewCount: 0,
        source: 'db_fallback'
      };
    }
  } catch (error) {
    console.error(`[ViewCountHelper] 讀取 viewCount 失敗 (${hash}):`, error);

    // 降級到 DB 快照
    if (dbSnapshot !== undefined) {
      return {
        viewCount: dbSnapshot,
        source: 'db_snapshot'
      };
    }

    return {
      viewCount: 0,
      source: 'db_fallback'
    };
  }
}

/**
 * 批量獲取多個短網址的瀏覽次數
 *
 * @param hashes 短網址 hash 數組及其對應的 DB 快照值
 * @returns Map<hash, ViewCountResult>
 */
export async function getBatchViewCounts(
  hashes: Array<{ hash: string; dbSnapshot?: number }>
): Promise<Map<string, ViewCountResult>> {
  const results = new Map<string, ViewCountResult>();

  // 並行獲取所有 viewCount
  await Promise.all(
    hashes.map(async ({ hash, dbSnapshot }) => {
      const result = await getViewCount(hash, dbSnapshot);
      results.set(hash, result);
    })
  );

  return results;
}

/**
 * 檢查 Redis 連接狀態
 *
 * @returns Redis 是否可用
 */
export function isRedisAvailable(): boolean {
  return trackingServiceV2.isRedisConnected();
}

/**
 * 獲取健康狀態
 *
 * @returns 健康狀態信息
 */
export async function getHealthStatus(): Promise<{
  redis: boolean;
  activeHashesCount: number;
  message: string;
}> {
  const health = await trackingServiceV2.healthCheck();

  return {
    redis: health.redis,
    activeHashesCount: health.activeHashesCount,
    message: health.redis
      ? `Redis 正常運行，追蹤 ${health.activeHashesCount} 個活躍短網址`
      : 'Redis 不可用，使用降級模式（從 DB 快照讀取統計數據）'
  };
}
