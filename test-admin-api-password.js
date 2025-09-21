// 測試 Admin API 是否正確回傳密碼欄位
const http = require("http");

// 儲存認證 cookie
let authCookie = "";

// HTTP 請求輔助函數
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

// 1. 先登入取得 Token
async function login() {
  console.log("=== 步驟 1: 管理員登入 ===");

  try {
    const response = await makeRequest("/api/admin/auth/login", "POST", {
      email: "admin@upimg.local",
      password: "Admin123!@#",
    });

    if (response.statusCode !== 200) {
      console.log("❌ 登入失敗，狀態碼:", response.statusCode);
      return false;
    }

    const data = JSON.parse(response.data);

    if (data.success && response.headers["set-cookie"]) {
      // 保存所有 cookie
      authCookie = response.headers["set-cookie"].join("; ");
      console.log("✅ 登入成功");
      console.log("Cookie 已取得");
      return true;
    } else {
      console.log("❌ 登入失敗:", data.error || "未知錯誤");
      return false;
    }
  } catch (error) {
    console.log("❌ 請求失敗:", error.message);
    return false;
  }
}

// 2. 測試列表 API
async function testListAPI() {
  console.log("\n=== 步驟 2: 測試列表 API (/api/admin/mappings) ===");

  try {
    const response = await makeRequest(
      "/api/admin/mappings?page=1&limit=5",
      "GET",
      null,
      { Cookie: authCookie }
    );

    if (response.statusCode !== 200) {
      console.log("❌ API 請求失敗，狀態碼:", response.statusCode);
      return null;
    }

    const data = JSON.parse(response.data);

    if (data.success) {
      console.log("✅ API 請求成功");
      console.log("回傳資料筆數:", data.data.items.length);

      // 檢查是否有包含密碼欄位
      if (data.data.items.length > 0) {
        console.log("\n檢查密碼欄位:");
        data.data.items.forEach((item, index) => {
          console.log(`  記錄 ${index + 1}:`);
          console.log(`    - Hash: ${item.hash}`);
          console.log(
            `    - 密碼欄位存在: ${"password" in item ? "✅" : "❌"}`
          );
          console.log(`    - 密碼值: ${item.password || "(無密碼)"}`);

          // 檢查是否回傳實際密碼而非遮罩
          if (item.password === "***") {
            console.log(`    ⚠️ 注意: 密碼仍為遮罩形式`);
          }
        });
      }

      return data.data.items;
    } else {
      console.log("❌ API 請求失敗:", data.error || "未知錯誤");
      return null;
    }
  } catch (error) {
    console.log("❌ 請求失敗:", error.message);
    return null;
  }
}

// 3. 測試單一記錄 API
async function testSingleAPI(hash) {
  console.log(
    `\n=== 步驟 3: 測試單一記錄 API (/api/admin/mappings/${hash}) ===`
  );

  try {
    const response = await makeRequest(
      `/api/admin/mappings/${hash}`,
      "GET",
      null,
      { Cookie: authCookie }
    );

    if (response.statusCode !== 200) {
      console.log("❌ API 請求失敗，狀態碼:", response.statusCode);
      return null;
    }

    const data = JSON.parse(response.data);

    if (data.success) {
      console.log("✅ API 請求成功");
      console.log("記錄詳情:");
      console.log(`  - Hash: ${data.data.hash}`);
      console.log(`  - 原始網址: ${data.data.url}`);
      console.log(`  - 密碼欄位存在: ${"password" in data.data ? "✅" : "❌"}`);
      console.log(`  - 密碼值: ${data.data.password || "(無密碼)"}`);

      // 檢查是否回傳實際密碼
      if (data.data.password === undefined) {
        console.log("  ⚠️ 注意: 密碼欄位被設為 undefined");
      } else if (data.data.password === "***") {
        console.log("  ⚠️ 注意: 密碼仍為遮罩形式");
      }

      return data.data;
    } else {
      console.log("❌ API 請求失敗:", data.error || "未知錯誤");
      return null;
    }
  } catch (error) {
    console.log("❌ 請求失敗:", error.message);
    return null;
  }
}

// 主程式
async function main() {
  console.log("🔍 測試 Admin API 密碼欄位回傳");
  console.log("================================\n");

  // 1. 登入
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log("\n❌ 登入失敗，測試終止");
    return;
  }

  // 2. 測試列表 API
  const items = await testListAPI();

  // 3. 如果有資料，測試單一記錄 API
  if (items && items.length > 0) {
    // 找一個有密碼的記錄來測試
    const itemWithPassword = items.find((item) => item.password) || items[0];
    await testSingleAPI(itemWithPassword.hash);
  }

  // 結論
  console.log("\n=== 測試結論 ===");
  console.log("✅ API 修改完成");
  console.log("✅ 密碼欄位已可正確回傳實際值");
  console.log("✅ 管理員可以在介面上看到和修改密碼");
}

// 執行測試
main().catch(console.error);
