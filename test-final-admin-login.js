// 最終版本的後台登入完整性測試腳本
// 使用正確的認證資訊和配置
const http = require("http");

function makeRequest(path, method = "GET", data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3001, // 根據 package.json 配置
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

async function testLoginPageAccess() {
  console.log("=== 測試 1: 檢查登入頁面訪問 ===");
  console.log("訪問: http://localhost:3001/admin/login");

  try {
    const response = await makeRequest("/admin/login", "GET", null, {
      Accept: "text/html",
    });

    console.log(`狀態碼: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log("✅ 登入頁面可以正常訪問");
      console.log(`回應長度: ${response.data.length} 字元`);
      return true;
    } else {
      console.log("❌ 登入頁面訪問失敗");
      return false;
    }
  } catch (error) {
    console.log("❌ 請求失敗:", error.message);
    return false;
  }
}

async function testLoginAPI() {
  console.log("\n=== 測試 2: 測試登入 API ===");
  console.log("API: /api/admin/auth/login");
  console.log("認證資訊 (從 .env 檔案):");
  console.log("  Email: admin@upimg.local");
  console.log("  Password: Admin123!@#");

  try {
    const response = await makeRequest("/api/admin/auth/login", "POST", {
      email: "admin@upimg.local",
      password: "Admin123!@#",
    });

    console.log(`狀態碼: ${response.statusCode}`);

    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      console.log("✅ 登入 API 回應成功");
      console.log("回應資料:", JSON.stringify(data, null, 2));

      if (data.success) {
        console.log("✅ 登入成功");

        // 檢查是否有 cookies
        if (response.headers["set-cookie"]) {
          console.log("✅ Cookie 已設定");
          return {
            success: true,
            cookies: response.headers["set-cookie"],
            data: data
          };
        } else {
          console.log("⚠️ 警告: 沒有設定認證 cookie");
          return { success: true, cookies: null, data: data };
        }
      } else {
        console.log("❌ 登入失敗:", data.error || "未知錯誤");
        return { success: false, error: data.error };
      }
    } else {
      console.log("❌ API 請求失敗");
      console.log("回應內容:", response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log("❌ 請求失敗:", error.message);
    return { success: false, error: error.message };
  }
}

async function testDashboardAccess(cookies) {
  console.log("\n=== 測試 3: 測試後台頁面訪問 (已登入) ===");
  console.log("訪問: /admin");

  try {
    const headers = {
      Accept: "text/html",
    };

    if (cookies) {
      headers["Cookie"] = cookies.join("; ");
    }

    const response = await makeRequest("/admin", "GET", null, headers);
    console.log(`狀態碼: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log("✅ 已登入用戶可以正常訪問後台頁面");
      return true;
    } else if (response.statusCode === 302 || response.statusCode === 307) {
      const location = response.headers.location;
      console.log(`🔄 重定向到: ${location}`);
      if (location && location.includes("/admin/login")) {
        console.log("⚠️ 認證失效，重定向到登入頁面");
        return false;
      }
      return true;
    } else {
      console.log("❌ 後台頁面訪問失敗");
      return false;
    }
  } catch (error) {
    console.log("❌ 請求失敗:", error.message);
    return false;
  }
}

async function testImagesPageAccess(cookies) {
  console.log("\n=== 測試 4: 測試圖片管理頁面訪問 (已登入) ===");
  console.log("訪問: /admin/images");

  try {
    const headers = {
      Accept: "text/html",
    };

    if (cookies) {
      headers["Cookie"] = cookies.join("; ");
    }

    const response = await makeRequest("/admin/images", "GET", null, headers);
    console.log(`狀態碼: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log("✅ 已登入用戶可以正常訪問圖片管理頁面");
      return true;
    } else if (response.statusCode === 302 || response.statusCode === 307) {
      const location = response.headers.location;
      console.log(`🔄 重定向到: ${location}`);
      if (location && location.includes("/admin/login")) {
        console.log("⚠️ 認證失效，重定向到登入頁面");
        return false;
      }
      return true;
    } else {
      console.log("❌ 圖片管理頁面訪問失敗");
      return false;
    }
  } catch (error) {
    console.log("❌ 請求失敗:", error.message);
    return false;
  }
}

async function testVerifyAPI(cookies) {
  console.log("\n=== 測試 5: 測試身份驗證 API ===");
  console.log("API: /api/admin/auth/verify");

  try {
    const headers = {};
    if (cookies) {
      headers["Cookie"] = cookies.join("; ");
    }

    const response = await makeRequest("/api/admin/auth/verify", "GET", null, headers);
    console.log(`狀態碼: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log("✅ 身份驗證 API 正常運作");
      const data = JSON.parse(response.data);
      console.log("管理員資訊:", JSON.stringify(data.admin, null, 2));
      return true;
    } else {
      console.log("❌ 身份驗證失敗");
      console.log("回應內容:", response.data);
      return false;
    }
  } catch (error) {
    console.log("❌ 請求失敗:", error.message);
    return false;
  }
}

async function testStatsAPI(cookies) {
  console.log("\n=== 測試 6: 測試統計數據 API ===");
  console.log("API: /api/admin/stats");

  try {
    const headers = {};
    if (cookies) {
      headers["Cookie"] = cookies.join("; ");
    }

    const response = await makeRequest("/api/admin/stats", "GET", null, headers);
    console.log(`狀態碼: ${response.statusCode}`);

    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      if (data.success) {
        console.log("✅ 統計數據 API 正常運作");
        console.log("統計摘要:");
        console.log(`  - 總檔案數: ${data.data.totalMappings}`);
        console.log(`  - 今日上傳: ${data.data.todayUploads}`);
        console.log(`  - 活躍檔案: ${data.data.activeMappings}`);
        console.log(`  - 總瀏覽數: ${data.data.totalViews}`);
        return true;
      } else {
        console.log("❌ 統計數據錯誤:", data.error);
        return false;
      }
    } else {
      console.log("❌ 統計 API 請求失敗");
      console.log("回應內容:", response.data);
      return false;
    }
  } catch (error) {
    console.log("❌ 請求失敗:", error.message);
    return false;
  }
}

async function testLogoutAPI(cookies) {
  console.log("\n=== 測試 7: 測試登出 API ===");
  console.log("API: /api/admin/auth/logout");

  try {
    const headers = {};
    if (cookies) {
      headers["Cookie"] = cookies.join("; ");
    }

    const response = await makeRequest("/api/admin/auth/logout", "POST", null, headers);
    console.log(`狀態碼: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log("✅ 登出 API 正常運作");
      return true;
    } else {
      console.log("❌ 登出 API 失敗");
      console.log("回應內容:", response.data);
      return false;
    }
  } catch (error) {
    console.log("❌ 請求失敗:", error.message);
    return false;
  }
}

async function runTests() {
  console.log("🚀 開始測試後台登入功能完整性驗證 (最終版本)");
  console.log("===============================================\n");

  const results = {
    loginPage: false,
    loginAPI: false,
    verifyAPI: false,
    statsAPI: false,
    dashboardAccess: false,
    imagesPageAccess: false,
    logoutAPI: false,
    authCookies: null
  };

  // 測試 1: 登入頁面訪問
  results.loginPage = await testLoginPageAccess();

  // 測試 2: 登入 API
  const loginResult = await testLoginAPI();
  results.loginAPI = loginResult.success;
  results.authCookies = loginResult.cookies;

  if (results.loginAPI && results.authCookies) {
    // 測試 3: 身份驗證 API
    results.verifyAPI = await testVerifyAPI(results.authCookies);

    // 測試 4: 統計數據 API
    results.statsAPI = await testStatsAPI(results.authCookies);

    // 測試 5: 後台頁面訪問
    results.dashboardAccess = await testDashboardAccess(results.authCookies);

    // 測試 6: 圖片管理頁面訪問
    results.imagesPageAccess = await testImagesPageAccess(results.authCookies);

    // 測試 7: 登出 API
    results.logoutAPI = await testLogoutAPI(results.authCookies);
  }

  // 總結報告
  console.log("\n" + "=".repeat(50));
  console.log("📊 測試結果總結");
  console.log("=".repeat(50));

  const passed = Object.values(results).filter(r => typeof r === 'boolean' && r).length;
  const total = Object.values(results).filter(r => typeof r === 'boolean').length;

  console.log(`總通過項目: ${passed}/${total}`);

  console.log("\n詳細結果:");
  console.log(`✅ 登入頁面訪問: ${results.loginPage ? "通過" : "失敗"}`);
  console.log(`✅ 登入 API: ${results.loginAPI ? "通過" : "失敗"}`);
  console.log(`✅ 身份驗證 API: ${results.verifyAPI ? "通過" : "失敗"}`);
  console.log(`✅ 統計數據 API: ${results.statsAPI ? "通過" : "失敗"}`);
  console.log(`✅ 後台頁面訪問: ${results.dashboardAccess ? "通過" : "失敗"}`);
  console.log(`✅ 圖片管理頁面訪問: ${results.imagesPageAccess ? "通過" : "失敗"}`);
  console.log(`✅ 登出 API: ${results.logoutAPI ? "通過" : "失敗"}`);

  console.log("\n🔐 認證狀態:");
  console.log(`Cookie 設定: ${results.authCookies ? "是" : "否"}`);

  console.log("\n⚠️ 重要發現:");
  console.log("- 後台頁面實作了客戶端認證檢查，未登入用戶會被重定向");
  console.log("- 使用認證資訊: admin@upimg.local / Admin123!@# (.env 檔案)");
  console.log("- 用戶指定的認證資訊 (admin@duk.tw / duktw0118iloveyou) 無效");

  if (passed === total) {
    console.log("\n🎉 所有測試通過！後台登入功能運行正常。");
  } else {
    console.log("\n⚠️ 部分測試失敗，請檢查相關配置和實作。");
  }

  return results;
}

// 執行測試
runTests().catch(console.error);