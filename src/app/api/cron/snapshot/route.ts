import { NextRequest, NextResponse } from 'next/server';
import { trackingServiceV2 } from '@/lib/tracking-service-v2';

/**
 * Cron Job API：每日快照備份
 *
 * 用途：將 Redis 中的統計數據定期備份到 PostgreSQL
 * 觸發方式：
 * 1. Vercel Cron Job（生產環境）
 * 2. 手動 curl 觸發（測試/緊急使用）
 *
 * 安全性：使用 Authorization Bearer Token 驗證
 *
 * 設定 Vercel Cron Job：
 * 在 vercel.json 添加：
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/snapshot",
 *       "schedule": "0 3 * * *"
 *     }
 *   ]
 * }
 *
 * 觸發示例：
 * curl -X POST https://your-domain.com/api/cron/snapshot \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證請求來源（Vercel Cron 或授權的請求）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;

    // 檢查授權
    if (cronSecret) {
      const expectedAuth = `Bearer ${cronSecret}`;

      if (authHeader !== expectedAuth) {
        console.warn('[Snapshot API] 未授權的請求嘗試');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      // 如果沒有設定 secret，記錄警告但允許執行（開發環境）
      console.warn('[Snapshot API] 未設定 CRON_SECRET，建議在生產環境設定');
    }

    // 執行快照備份
    console.log('[Snapshot API] 開始執行每日快照備份...');
    const startTime = Date.now();

    const snapshotCount = await trackingServiceV2.createDailySnapshot();

    const duration = Date.now() - startTime;

    console.log(`[Snapshot API] 快照備份完成: ${snapshotCount} 個項目，耗時 ${duration}ms`);

    // 返回結果
    return NextResponse.json({
      success: true,
      snapshotCount,
      duration,
      timestamp: new Date().toISOString(),
      message: `成功備份 ${snapshotCount} 個短網址的統計數據`
    });

  } catch (error) {
    console.error('[Snapshot API] 快照備份失敗:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET 方法：查看快照狀態
 */
export async function GET(request: NextRequest) {
  try {
    // 同樣需要授權
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;

    if (cronSecret) {
      const expectedAuth = `Bearer ${cronSecret}`;

      if (authHeader !== expectedAuth) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // 健康檢查
    const health = await trackingServiceV2.healthCheck();

    return NextResponse.json({
      status: 'ready',
      redis: health.redis,
      activeHashesCount: health.activeHashesCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
