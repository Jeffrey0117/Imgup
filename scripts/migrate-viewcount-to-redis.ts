/**
 * ViewCount 數據遷移腳本
 *
 * 用途：將現有的 viewCount 數據從 PostgreSQL 遷移到 Redis
 * 執行時機：首次部署優化版追蹤服務時執行一次
 *
 * 使用方法：
 * npx ts-node scripts/migrate-viewcount-to-redis.ts
 *
 * 或添加到 package.json：
 * "scripts": {
 *   "migrate:viewcount": "ts-node scripts/migrate-viewcount-to-redis.ts"
 * }
 * 然後執行：npm run migrate:viewcount
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('ViewCount 數據遷移到 Redis');
  console.log('========================================\n');

  // 檢查 Redis 配置
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ 錯誤：未設定 REDIS_URL 環境變數');
    console.log('請在 .env 文件中設定 REDIS_URL');
    process.exit(1);
  }

  // 連接 Redis
  console.log('📡 連接 Redis...');
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  try {
    await redis.ping();
    console.log('✅ Redis 連接成功\n');
  } catch (error) {
    console.error('❌ Redis 連接失敗:', error);
    process.exit(1);
  }

  try {
    // 查詢所有未刪除的短網址
    console.log('📊 查詢資料庫中的短網址數據...');
    const mappings = await prisma.mapping.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        hash: true,
        viewCount: true,
      },
    });

    console.log(`✅ 找到 ${mappings.length} 個短網址\n`);

    if (mappings.length === 0) {
      console.log('ℹ️  沒有需要遷移的數據');
      return;
    }

    // 統計信息
    let migratedCount = 0;
    let skippedCount = 0;
    let totalViews = 0;

    console.log('🚀 開始遷移數據...\n');

    // 使用 pipeline 批量寫入（提高性能）
    const BATCH_SIZE = 100;
    for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
      const batch = mappings.slice(i, i + BATCH_SIZE);
      const pipeline = redis.pipeline();

      for (const mapping of batch) {
        const { hash, viewCount } = mapping;

        // 只遷移 viewCount > 0 的記錄
        if (viewCount > 0) {
          const redisKey = `upimg:v2:views:${hash}`;

          // 檢查 Redis 中是否已存在（避免覆蓋）
          const existing = await redis.get(redisKey);

          if (existing) {
            console.log(`⚠️  跳過 ${hash}：Redis 中已存在 (${existing} views)`);
            skippedCount++;
          } else {
            // 寫入 Redis
            pipeline.set(redisKey, viewCount.toString());

            // 添加到活躍 hash 集合
            pipeline.sadd('upimg:v2:active_hashes', hash);

            totalViews += viewCount;
            migratedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      // 執行批量操作
      await pipeline.exec();

      // 顯示進度
      const progress = Math.min(i + BATCH_SIZE, mappings.length);
      console.log(`📦 進度: ${progress}/${mappings.length} (${Math.round((progress / mappings.length) * 100)}%)`);
    }

    console.log('\n========================================');
    console.log('遷移完成！');
    console.log('========================================');
    console.log(`✅ 成功遷移：${migratedCount} 個短網址`);
    console.log(`⏭️  跳過：${skippedCount} 個短網址`);
    console.log(`📊 總瀏覽次數：${totalViews.toLocaleString()}`);
    console.log(`📈 平均瀏覽次數：${migratedCount > 0 ? Math.round(totalViews / migratedCount) : 0}`);

    // 驗證遷移結果
    console.log('\n📋 驗證遷移結果...');
    const activeHashesCount = await redis.scard('upimg:v2:active_hashes');
    console.log(`✅ Redis 中活躍 hash 數量：${activeHashesCount}`);

    // 抽樣驗證
    const sample = mappings.slice(0, Math.min(5, mappings.length));
    console.log('\n🔍 抽樣驗證（前 5 個）:');
    for (const { hash, viewCount } of sample) {
      if (viewCount > 0) {
        const redisValue = await redis.get(`upimg:v2:views:${hash}`);
        const match = redisValue === viewCount.toString();
        console.log(`  ${match ? '✅' : '❌'} ${hash}: DB=${viewCount}, Redis=${redisValue || 0}`);
      }
    }

    console.log('\n✅ 遷移腳本執行完成！');
    console.log('ℹ️  提示：建議執行快照備份以確保數據一致性');
    console.log('   curl -X POST http://localhost:3000/api/cron/snapshot \\');
    console.log('     -H "Authorization: Bearer YOUR_CRON_SECRET"\n');

  } catch (error) {
    console.error('\n❌ 遷移失敗:', error);
    throw error;
  } finally {
    // 清理連接
    await redis.quit();
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
