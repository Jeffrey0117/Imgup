const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function testAdmin() {
  try {
    // 檢查現有管理員
    const existingAdmin = await prisma.admin.findFirst({
      where: { email: "admin@upimg.local" },
    });

    if (existingAdmin) {
      console.log("🔍 找到管理員帳號:", existingAdmin.email);

      // 測試密碼
      const password = "Admin123!@#";
      const isValid = await bcrypt.compare(
        password,
        existingAdmin.passwordHash
      );
      console.log("密碼驗證結果:", isValid);

      if (!isValid) {
        console.log("🔧 更新密碼...");
        const newHash = await bcrypt.hash(password, 12);
        await prisma.admin.update({
          where: { id: existingAdmin.id },
          data: { passwordHash: newHash },
        });
        console.log("✅ 密碼已更新");
      }
    } else {
      console.log("❌ 未找到管理員帳號，建立新帳號...");
      const passwordHash = await bcrypt.hash("Admin123!@#", 12);
      const admin = await prisma.admin.create({
        data: {
          email: "admin@upimg.local",
          username: "admin",
          passwordHash,
          role: "super_admin",
          isActive: true,
        },
      });
      console.log("✅ 管理員帳號已建立:", admin.email);
    }

    // 驗證最終狀態
    const finalAdmin = await prisma.admin.findFirst({
      where: { email: "admin@upimg.local" },
    });
    const finalValid = await bcrypt.compare(
      "Admin123!@#",
      finalAdmin.passwordHash
    );
    console.log("\n📊 最終驗證:");
    console.log("   帳號:", finalAdmin.email);
    console.log("   密碼正確:", finalValid);
  } catch (error) {
    console.error("❌ 錯誤:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdmin();
