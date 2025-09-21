/**
 * 測試 Dashboard 統計數據 API
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log("🔍 檢查資料庫中的 Mapping 記錄...\n");

  try {
    // 查詢總數
    const totalCount = await prisma.mapping.count({
      where: { isDeleted: false },
    });

    // 查詢前5筆記錄
    const mappings = await prisma.mapping.findMany({
      where: { isDeleted: false },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        hash: true,
        filename: true,
        createdAt: true,
        viewCount: true,
        isDeleted: true,
      },
    });

    console.log(`📊 資料庫統計：`);
    console.log(`   總檔案數: ${totalCount}`);
    console.log(`   最近記錄:`);

    if (mappings.length === 0) {
      console.log(`   ❌ 資料庫中沒有任何 Mapping 記錄！`);
      console.log(`\n💡 建議：需要先上傳一些測試檔案`);
    } else {
      mappings.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.filename} (${m.hash}) - ${m.createdAt}`);
      });
    }

    // 建立測試資料
    if (totalCount === 0) {
      console.log("\n📝 建立測試資料...");

      const testData = [
        { filename: "test-image-1.jpg", url: "https://example.com/img1.jpg" },
        { filename: "test-image-2.png", url: "https://example.com/img2.png" },
        { filename: "test-document.pdf", url: "https://example.com/doc.pdf" },
      ];

      for (const data of testData) {
        const hash = Math.random().toString(36).substring(2, 8);
        await prisma.mapping.create({
          data: {
            hash,
            filename: data.filename,
            url: data.url,
            shortUrl: `http://localhost:3001/${hash}`,
            createdAt: new Date(),
            viewCount: Math.floor(Math.random() * 100),
            isDeleted: false,
          },
        });
        console.log(`   ✅ 建立: ${data.filename} (${hash})`);
      }

      console.log("\n✅ 測試資料建立完成！");
    }

    // 重新查詢統計
    const finalCount = await prisma.mapping.count({
      where: { isDeleted: false },
    });

    const todayCount = await prisma.mapping.count({
      where: {
        isDeleted: false,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    console.log("\n📊 最終統計結果：");
    console.log(`   總檔案數: ${finalCount}`);
    console.log(`   今日上傳: ${todayCount}`);
  } catch (error) {
    console.error("❌ 錯誤：", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 執行測試
if (require.main === module) {
  checkDatabase();
}

module.exports = { checkDatabase };
