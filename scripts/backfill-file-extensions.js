/**
 * 補齊舊資料的 fileExtension 欄位
 * 
 * 此腳本會掃描所有 fileExtension 為 null 的 Mapping 記錄，
 * 並嘗試從檔案名稱或原始 URL 推斷副檔名，然後更新至資料庫。
 * 
 * 使用方式：
 * node scripts/backfill-file-extensions.js [--dry-run] [--batch-size=100]
 */
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// 支援的副檔名映射
const SUPPORTED_EXTENSIONS = {
  'png': '.png',
  'jpg': '.jpg',
  'jpeg': '.jpg',
  'gif': '.gif',
  'webp': '.webp',
  'svg': '.svg',
};

/**
 * 從檔案名稱或 URL 檢測副檔名
 */
function detectExtensionFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // 移除查詢參數
    const cleanUrl = url.split('?')[0];
    const ext = path.extname(cleanUrl).toLowerCase().replace('.', '');
    
    if (SUPPORTED_EXTENSIONS[ext]) {
      return SUPPORTED_EXTENSIONS[ext];
    }
  } catch (error) {
    console.warn(`無法解析 URL: ${url}`, error.message);
  }
  
  return null;
}

/**
 * 從檔案名稱檢測副檔名
 */
function detectExtensionFromFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  
  if (SUPPORTED_EXTENSIONS[ext]) {
    return SUPPORTED_EXTENSIONS[ext];
  }
  
  return null;
}

/**
 * 綜合檢測副檔名
 */
function detectFileExtension(mapping) {
  // 優先從檔案名稱檢測
  let extension = detectExtensionFromFilename(mapping.filename);
  if (extension) return extension;
  
  // 從原始 URL 檢測
  extension = detectExtensionFromUrl(mapping.url);
  if (extension) return extension;
  
  // 從短網址檢測
  extension = detectExtensionFromUrl(mapping.shortUrl);
  if (extension) return extension;
  
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;
  
  console.log(`🔍 開始補齊 fileExtension 欄位...`);
  console.log(`📊 批次大小: ${batchSize}`);
  console.log(`🔄 模式: ${isDryRun ? '試跑（不會實際更新）' : '實際更新'}`);
  console.log('');
  
  const prisma = new PrismaClient();
  
  try {
    // 查詢所有 fileExtension 為 null 的記錄
    const totalCount = await prisma.mapping.count({
      where: {
        fileExtension: null,
        isDeleted: false, // 只處理未刪除的記錄
      },
    });
    
    console.log(`📋 找到 ${totalCount} 筆需要處理的記錄`);
    
    if (totalCount === 0) {
      console.log('✅ 沒有需要處理的記錄');
      return;
    }
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    
    // 分批處理
    for (let offset = 0; offset < totalCount; offset += batchSize) {
      const batch = await prisma.mapping.findMany({
        where: {
          fileExtension: null,
          isDeleted: false,
        },
        select: {
          id: true,
          hash: true,
          filename: true,
          url: true,
          shortUrl: true,
        },
        skip: offset,
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });
      
      console.log(`🔄 處理批次 ${Math.floor(offset / batchSize) + 1}/${Math.ceil(totalCount / batchSize)} (${batch.length} 筆)`);
      
      for (const mapping of batch) {
        const extension = detectFileExtension(mapping);
        processed++;
        
        if (extension) {
          console.log(`  ✅ ${mapping.hash} (${mapping.filename}) -> ${extension}`);
          
          if (!isDryRun) {
            try {
              await prisma.mapping.update({
                where: { id: mapping.id },
                data: { fileExtension: extension },
              });
            } catch (error) {
              console.error(`  ❌ 更新失敗 ${mapping.hash}:`, error.message);
              continue;
            }
          }
          
          updated++;
        } else {
          console.log(`  ⚠️  ${mapping.hash} (${mapping.filename}) -> 無法判斷副檔名`);
          skipped++;
        }
      }
      
      // 避免資料庫負載過高
      if (offset + batchSize < totalCount) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('');
    console.log('📊 處理結果統計:');
    console.log(`  總處理筆數: ${processed}`);
    console.log(`  成功更新: ${updated}`);
    console.log(`  無法判斷: ${skipped}`);
    console.log(`  更新率: ${Math.round((updated / processed) * 100)}%`);
    
    if (isDryRun) {
      console.log('');
      console.log('💡 這是試跑模式，沒有實際更新資料庫');
      console.log('💡 移除 --dry-run 參數可實際執行更新');
    } else {
      console.log('');
      console.log('✅ 補齊作業完成');
    }
    
  } catch (error) {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 執行腳本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 未預期的錯誤:', error);
    process.exit(1);
  });
}

module.exports = {
  detectFileExtension,
  detectExtensionFromFilename,
  detectExtensionFromUrl,
};