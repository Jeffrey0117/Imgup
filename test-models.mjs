import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('測試資料庫連接...');

    // 測試基本連接
    await prisma.$connect();
    console.log('✓ 資料庫連接成功');

    // 測試 Mapping 模型 - 檢查 viewCount 欄位
    const mappings = await prisma.mapping.findMany({ take: 1 });
    console.log('✓ Mapping 模型可用，記錄數量:', mappings.length);

    if (mappings.length > 0) {
      console.log('✓ Mapping viewCount 欄位:', mappings[0].viewCount);

      // 如果 viewCount 為 null，初始化為 0
      if (mappings[0].viewCount === null) {
        await prisma.mapping.update({
          where: { id: mappings[0].id },
          data: { viewCount: 0 }
        });
        console.log('✓ 初始化 viewCount 為 0');
      }
    }

    // 測試 AccessLog 模型 - 檢查新欄位
    const accessLogs = await prisma.accessLog.findMany({ take: 1 });
    console.log('✓ AccessLog 模型可用，記錄數量:', accessLogs.length);

    if (accessLogs.length > 0) {
      console.log('✓ AccessLog 擴充欄位可用 - refererDomain:', accessLogs[0].refererDomain, 'accessType:', accessLogs[0].accessType);
    }

    // 測試 ReferrerStats 模型
    const referrerStats = await prisma.referrerStats.findMany({ take: 1 });
    console.log('✓ ReferrerStats 模型可用，記錄數量:', referrerStats.length);

    console.log('所有模型測試通過！');

  } catch (error) {
    console.error('資料庫測試失敗:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();