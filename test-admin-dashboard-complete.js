const http = require("http");

function makeRequest(path, method = "GET", data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3001,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testCompleteAdminDashboard() {
  console.log("🚀 完整管理員儀表板測試\n");
  console.log("=".repeat(50));

  try {
    // 1. 檢查服務器狀態
    console.log("1. 🔍 檢查服務器狀態...");
    const homeResponse = await makeRequest("/");
    if (homeResponse.statusCode !== 200) {
      throw new Error(`服務器未運行，狀態碼: ${homeResponse.statusCode}`);
    }
    console.log("   ✅ 服務器正常運行");

    // 2. 測試管理員登入
    console.log("\n2. 🔐 測試管理員登入...");
    const loginResponse = await makeRequest("/api/admin/auth/login", "POST", {
      email: "admin@upimg.local",
      password: "admin123",
    });

    if (loginResponse.statusCode !== 200) {
      console.log("登入回應:", loginResponse.data);
      throw new Error(`登入失敗，狀態碼: ${loginResponse.statusCode}`);
    }

    const loginData = JSON.parse(loginResponse.data);
    if (!loginData.success) {
      throw new Error(`登入失敗: ${loginData.error}`);
    }

    console.log("   ✅ 登入成功");

    // 提取 token（可能在 cookie 或回應中）
    let authToken = loginData.data?.accessToken;
    let authCookie = "";

    if (loginResponse.headers["set-cookie"]) {
      authCookie = loginResponse.headers["set-cookie"][0];
      console.log("   ✅ 認證 cookie 已設定");
    }

    // 3. 測試身份驗證
    console.log("\n3. 🛡️  測試身份驗證...");
    const verifyHeaders = {};
    if (authToken) {
      verifyHeaders["Authorization"] = `Bearer ${authToken}`;
    }
    if (authCookie) {
      verifyHeaders["Cookie"] = authCookie;
    }

    const verifyResponse = await makeRequest(
      "/api/admin/auth/verify",
      "GET",
      null,
      verifyHeaders
    );

    if (verifyResponse.statusCode !== 200) {
      throw new Error(`身份驗證失敗，狀態碼: ${verifyResponse.statusCode}`);
    }
    console.log("   ✅ 身份驗證成功");

    // 4. 測試統計數據 API
    console.log("\n4. 📊 測試統計數據 API...");
    const statsResponse = await makeRequest(
      "/api/admin/stats",
      "GET",
      null,
      verifyHeaders
    );

    if (statsResponse.statusCode !== 200) {
      console.log("統計 API 回應:", statsResponse.data);
      throw new Error(`統計數據 API 失敗，狀態碼: ${statsResponse.statusCode}`);
    }

    const statsData = JSON.parse(statsResponse.data);
    if (statsData.success) {
      console.log("   ✅ 統計數據 API 正常");
      console.log("   📈 統計摘要:");
      console.log(`      總檔案數: ${statsData.data.totalMappings}`);
      console.log(`      今日上傳: ${statsData.data.todayUploads}`);
      console.log(`      活躍檔案: ${statsData.data.activeMappings}`);
      console.log(`      總瀏覽數: ${statsData.data.totalViews}`);
      console.log(`      最近上傳: ${statsData.data.recentUploads.length} 項`);
    } else {
      throw new Error(`統計數據錯誤: ${statsData.error}`);
    }

    // 5. 測試管理員頁面存取
    console.log("\n5. 🖥️  測試管理員頁面存取...");
    const dashboardResponse = await makeRequest("/admin", "GET", null, {
      ...verifyHeaders,
      Accept: "text/html",
    });

    if (dashboardResponse.statusCode !== 200) {
      throw new Error(
        `儀表板存取失敗，狀態碼: ${dashboardResponse.statusCode}`
      );
    }

    console.log("   ✅ 儀表板頁面載入成功");

    // 6. 測試登出功能
    console.log("\n6. 🚪 測試登出功能...");
    const logoutResponse = await makeRequest(
      "/api/admin/auth/logout",
      "POST",
      null,
      verifyHeaders
    );

    if (logoutResponse.statusCode !== 200) {
      throw new Error(`登出失敗，狀態碼: ${logoutResponse.statusCode}`);
    }

    console.log("   ✅ 登出功能正常");

    // 完成測試
    console.log("\n" + "=".repeat(50));
    console.log("🎉 所有測試成功通過！");
    console.log("\n📋 測試結果摘要:");
    console.log("   ✅ 服務器運行正常");
    console.log("   ✅ 管理員身份驗證");
    console.log("   ✅ 統計數據 API");
    console.log("   ✅ 儀表板頁面");
    console.log("   ✅ 登出功能");

    console.log("\n🌐 訪問管理員儀表板:");
    console.log(`   URL: http://localhost:3001/admin/login`);
    console.log(`   Email: admin@upimg.local`);
    console.log(`   密碼: admin123`);

    console.log("\n✨ 功能特色:");
    console.log("   📊 即時統計數據顯示");
    console.log("   📋 最近上傳檔案列表");
    console.log("   🚀 快速操作按鈕");
    console.log("   📱 響應式設計");
    console.log("   🔒 完整身份驗證保護");
    console.log("   🎨 美觀的玻璃擬態設計");
  } catch (error) {
    console.error("\n❌ 測試失敗:", error.message);
    console.log("\n🔧 故障排除:");
    console.log("1. 確認開發伺服器運行: npm run dev");
    console.log("2. 確認資料庫初始化: npx prisma migrate dev");
    console.log("3. 確認管理員帳號: node scripts/init-admin.js");
    console.log("4. 檢查 http://localhost:3001 是否可存取");
    process.exit(1);
  }
}

if (require.main === module) {
  testCompleteAdminDashboard();
}

module.exports = { testCompleteAdminDashboard };
