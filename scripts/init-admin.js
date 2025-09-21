/**
 * 初始管理員帳號建立腳本
 * 使用環境變數 ADMIN_EMAIL 和 ADMIN_PASSWORD 建立管理員帳號
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createInitialAdmin() {
  try {
    // 從環境變數讀取管理員資訊
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error(
        "❌ 錯誤: 請在 .env 檔案中設定 ADMIN_EMAIL 和 ADMIN_PASSWORD"
      );
      process.exit(1);
    }

    // 檢查是否已存在管理員
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(`⚠️  管理員帳號 ${adminEmail} 已存在，跳過建立`);
      return;
    }

    // 雜湊密碼
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // 從 email 生成 username
    const username = adminEmail.split("@")[0];

    // 建立管理員帳號
    const admin = await prisma.admin.create({
      data: {
        email: adminEmail,
        username: username,
        passwordHash: passwordHash,
        role: "admin",
        isActive: true,
      },
    });

    console.log("✅ 初始管理員帳號建立成功！");
    console.log(`📧 Email: ${admin.email}`);
    console.log(`👤 Username: ${admin.username}`);
    console.log(`🔑 Role: ${admin.role}`);
    console.log(`📅 建立時間: ${admin.createdAt}`);
    console.log("");
    console.log("🚀 現在可以使用此帳號登入管理後台：");
    console.log(`   👉 http://localhost:3001/admin/login`);
  } catch (error) {
    console.error("❌ 建立管理員帳號時發生錯誤:", error);

    if (error.code === "P2002") {
      console.error(
        "💡 提示: 帳號可能已存在，請檢查 email 或 username 是否重複"
      );
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 執行腳本
if (require.main === module) {
  console.log("🔧 開始建立初始管理員帳號...");
  createInitialAdmin();
}

module.exports = createInitialAdmin;
