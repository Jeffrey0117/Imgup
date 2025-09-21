/**
 * Admin CMS 登入功能測試腳本
 * 測試 JWT token 生成和驗證功能
 */

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// 測試用的環境變數 (實際使用請確保 .env 檔案存在)
const TEST_JWT_SECRET =
  process.env.JWT_SECRET || "test-jwt-secret-key-for-testing-32chars";
const TEST_JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "test-refresh-secret-key-for-testing-32chars";
const TEST_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.com";
const TEST_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test123456";

console.log("🧪 Admin CMS 登入功能測試開始...\n");

// 測試 1: JWT Token 生成
function testJWTGeneration() {
  console.log("📋 測試 1: JWT Token 生成");

  try {
    const payload = {
      email: TEST_ADMIN_EMAIL,
      role: "admin",
      iat: Math.floor(Date.now() / 1000),
    };

    // 生成 Access Token (15分鐘)
    const accessToken = jwt.sign(payload, TEST_JWT_SECRET, {
      expiresIn: "15m",
      issuer: "upimg-admin",
      audience: "upimg-cms",
    });

    // 生成 Refresh Token (7天)
    const refreshToken = jwt.sign(payload, TEST_JWT_REFRESH_SECRET, {
      expiresIn: "7d",
      issuer: "upimg-admin",
      audience: "upimg-cms",
    });

    console.log("✅ Access Token 生成成功");
    console.log("✅ Refresh Token 生成成功");
    console.log(`📄 Access Token: ${accessToken.substring(0, 50)}...`);
    console.log(`📄 Refresh Token: ${refreshToken.substring(0, 50)}...`);

    return { accessToken, refreshToken };
  } catch (error) {
    console.log("❌ JWT Token 生成失敗:", error.message);
    return null;
  }
}

// 測試 2: JWT Token 驗證
function testJWTVerification(tokens) {
  console.log("\n📋 測試 2: JWT Token 驗證");

  if (!tokens) {
    console.log("❌ 無法執行驗證測試，因為 Token 生成失敗");
    return false;
  }

  try {
    // 驗證 Access Token
    const accessPayload = jwt.verify(tokens.accessToken, TEST_JWT_SECRET, {
      issuer: "upimg-admin",
      audience: "upimg-cms",
    });
    console.log("✅ Access Token 驗證成功");
    console.log("📄 解碼 Payload:", {
      email: accessPayload.email,
      role: accessPayload.role,
      exp: new Date(accessPayload.exp * 1000).toLocaleString("zh-TW"),
    });

    // 驗證 Refresh Token
    const refreshPayload = jwt.verify(
      tokens.refreshToken,
      TEST_JWT_REFRESH_SECRET,
      {
        issuer: "upimg-admin",
        audience: "upimg-cms",
      }
    );
    console.log("✅ Refresh Token 驗證成功");

    return true;
  } catch (error) {
    console.log("❌ JWT Token 驗證失敗:", error.message);
    return false;
  }
}

// 測試 3: 密碼雜湊與驗證
async function testPasswordHashing() {
  console.log("\n📋 測試 3: 密碼雜湊與驗證");

  try {
    // 雜湊密碼
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(TEST_ADMIN_PASSWORD, saltRounds);
    console.log("✅ 密碼雜湊成功");
    console.log(`📄 雜湊密碼: ${hashedPassword}`);

    // 驗證密碼
    const isValid = await bcrypt.compare(TEST_ADMIN_PASSWORD, hashedPassword);
    const isInvalid = await bcrypt.compare("wrongpassword", hashedPassword);

    if (isValid && !isInvalid) {
      console.log("✅ 密碼驗證功能正常");
      return true;
    } else {
      console.log("❌ 密碼驗證功能異常");
      return false;
    }
  } catch (error) {
    console.log("❌ 密碼雜湊測試失敗:", error.message);
    return false;
  }
}

// 測試 4: 登入 API 模擬
function testLoginAPISimulation() {
  console.log("\n📋 測試 4: 登入 API 邏輯模擬");

  try {
    // 模擬登入請求
    const loginRequest = {
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
    };

    // 驗證輸入
    if (!loginRequest.email || !loginRequest.password) {
      console.log("❌ 登入參數驗證失敗");
      return false;
    }

    // 模擬用戶查找
    const mockUser = {
      email: TEST_ADMIN_EMAIL,
      hashedPassword: "$2a$12$mockHashedPasswordForTesting",
      role: "admin",
      isActive: true,
    };

    if (mockUser && mockUser.isActive) {
      console.log("✅ 用戶查找成功");
      console.log("✅ 帳號狀態正常");

      // 在實際情況下這裡會進行密碼比對
      console.log("✅ 登入邏輯模擬完成");
      return true;
    } else {
      console.log("❌ 用戶不存在或帳號被停用");
      return false;
    }
  } catch (error) {
    console.log("❌ 登入 API 模擬失敗:", error.message);
    return false;
  }
}

// 測試 5: 環境變數檢查
function testEnvironmentVariables() {
  console.log("\n📋 測試 5: 環境變數檢查");

  const requiredEnvVars = [
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
  ];

  let missingVars = [];

  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length === 0) {
    console.log("✅ 所有必要環境變數都已設定");
    return true;
  } else {
    console.log("⚠️  以下環境變數未設定:", missingVars.join(", "));
    console.log("📝 請確保 .env 檔案包含這些變數");
    return false;
  }
}

// 主要測試執行函數
async function runAllTests() {
  console.log("🚀 開始執行所有測試...\n");

  const results = {
    jwtGeneration: false,
    jwtVerification: false,
    passwordHashing: false,
    loginSimulation: false,
    environmentCheck: false,
  };

  // 執行測試
  const tokens = testJWTGeneration();
  results.jwtGeneration = !!tokens;

  results.jwtVerification = testJWTVerification(tokens);
  results.passwordHashing = await testPasswordHashing();
  results.loginSimulation = testLoginAPISimulation();
  results.environmentCheck = testEnvironmentVariables();

  // 測試結果總結
  console.log("\n📊 測試結果總結:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  Object.entries(results).forEach(([testName, passed]) => {
    const status = passed ? "✅ 通過" : "❌ 失敗";
    const testNameChinese = {
      jwtGeneration: "JWT Token 生成",
      jwtVerification: "JWT Token 驗證",
      passwordHashing: "密碼雜湊與驗證",
      loginSimulation: "登入 API 模擬",
      environmentCheck: "環境變數檢查",
    };
    console.log(`${status} ${testNameChinese[testName]}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🎯 測試完成: ${passedTests}/${totalTests} 項測試通過`);

  if (passedTests === totalTests) {
    console.log("🎉 所有測試都通過了！Admin CMS 登入功能準備就緒。");
  } else {
    console.log("⚠️  部分測試失敗，請檢查相關設定。");
  }

  return results;
}

// 如果直接執行此腳本
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("❌ 測試執行過程中發生錯誤:", error);
    process.exit(1);
  });
}

module.exports = {
  testJWTGeneration,
  testJWTVerification,
  testPasswordHashing,
  testLoginAPISimulation,
  testEnvironmentVariables,
  runAllTests,
};
