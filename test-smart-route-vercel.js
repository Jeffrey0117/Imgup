#!/usr/bin/env node

/**
 * 測試基於 vercel.json rewrites 的智能路由
 */

const https = require("https");

const BASE_URL = process.env.TEST_URL || "https://duk.tw";
const TEST_HASH = process.env.TEST_HASH || "tYQdkS";

console.log("🧪 測試智能路由 (vercel.json rewrites 方案)");
console.log(`📍 測試目標: ${BASE_URL}/${TEST_HASH}`);
console.log("");

async function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      headers: {
        "User-Agent": "SmartRoute-Test/1.0",
        ...headers,
      },
    };

    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 200),
          location: res.headers.location,
        });
      });
    });

    req.on("error", reject);
    req.setTimeout(10000, () => reject(new Error("Timeout")));
    req.end();
  });
}

async function testSmartRoute() {
  const testUrl = `${BASE_URL}/${TEST_HASH}`;

  const tests = [
    {
      name: "🖼️  圖片請求 (image/*)",
      headers: { Accept: "image/webp,image/apng,image/*,*/*;q=0.8" },
    },
    {
      name: "🖼️  IMG 標籤請求 (*/*)",
      headers: {
        Accept: "*/*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    },
    {
      name: "🌐 瀏覽器請求 (text/html)",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    },
    {
      name: "📊 API 請求 (application/json)",
      headers: { Accept: "application/json" },
    },
  ];

  for (const test of tests) {
    try {
      console.log(`\n${test.name}`);
      console.log(`Headers:`, test.headers);

      const result = await makeRequest(testUrl, test.headers);
      console.log(`Status: ${result.statusCode}`);

      if (result.location) {
        console.log(`Redirect: ${result.location}`);

        // 分析重定向目標
        if (result.location.includes("/p")) {
          console.log("✅ 重定向到預覽頁面");
        } else if (
          result.location.includes("imgur.com") ||
          result.location.includes(".jpg") ||
          result.location.includes(".png")
        ) {
          console.log("✅ 直接重定向到圖片");
        } else {
          console.log("📝 其他重定向");
        }
      } else if (result.statusCode === 200) {
        if (result.data.includes("{") && result.data.includes('"')) {
          console.log("✅ 回傳 JSON 資料");
        } else {
          console.log("📄 回傳 HTML 頁面");
        }
      }
    } catch (error) {
      console.log(`❌ 錯誤: ${error.message}`);
    }
  }
}

// 執行測試
testSmartRoute()
  .then(() => {
    console.log("\n🏁 測試完成");
  })
  .catch((error) => {
    console.error("測試失敗:", error);
    process.exit(1);
  });
