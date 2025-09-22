// 測試不同的認證資訊組合
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

async function testAuthCombination(email, password, label) {
  console.log(`\n🧪 測試 ${label}:`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);

  try {
    const response = await makeRequest("/api/admin/auth/login", "POST", {
      email: email,
      password: password,
    });

    console.log(`   狀態碼: ${response.statusCode}`);

    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      console.log("   ✅ 登入成功");
      return { success: true, data: data };
    } else {
      const data = JSON.parse(response.data);
      console.log(`   ❌ 登入失敗: ${data.error || '未知錯誤'}`);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.log(`   ❌ 請求失敗: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testAllCombinations() {
  console.log("🔐 測試所有認證資訊組合");
  console.log("========================\n");

  const combinations = [
    { email: "admin@duk.tw", password: "duktw0118iloveyou", label: "用戶指定認證資訊" },
    { email: "admin@upimg.local", password: "Admin123!@#", label: ".env 檔案認證資訊" },
    { email: "admin@duk.tw", password: "Admin123!@#", label: "混合認證資訊 1" },
    { email: "admin@upimg.local", password: "duktw0118iloveyou", label: "混合認證資訊 2" },
  ];

  const results = [];

  for (const combo of combinations) {
    const result = await testAuthCombination(combo.email, combo.password, combo.label);
    results.push({ ...combo, result: result });
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 認證測試總結");
  console.log("=".repeat(50));

  const successful = results.filter(r => r.result.success);

  if (successful.length > 0) {
    console.log("✅ 找到有效的認證資訊:");
    successful.forEach(r => {
      console.log(`   - ${r.label}: ${r.email} / ${r.password}`);
    });
  } else {
    console.log("❌ 所有認證資訊組合都失敗");
    console.log("💡 可能需要檢查:");
    console.log("   1. 管理員帳號是否已建立");
    console.log("   2. 資料庫連線是否正常");
    console.log("   3. 環境變數是否正確設定");
  }

  return results;
}

// 執行測試
testAllCombinations().catch(console.error);