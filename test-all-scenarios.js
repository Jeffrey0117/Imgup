/**
 * 測試所有智能路由場景
 * 驗證手機、桌面瀏覽器、圖片請求等各種情況
 */

async function testAllScenarios(
  baseUrl = "http://localhost:3000",
  testHash = "abc123"
) {
  console.log("🧪 完整智能路由測試\n");

  const scenarios = [
    {
      name: "🖥️ 桌面 Chrome 瀏覽器",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      expected: "預覽頁面 (/p)",
    },
    {
      name: "📱 手機 Safari 瀏覽器",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
      },
      expected: "預覽頁面 (/p)",
    },
    {
      name: "📱 手機 Chrome 瀏覽器",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      },
      expected: "預覽頁面 (/p)",
    },
    {
      name: "🖼️ img 標籤請求（網頁中的圖片）",
      headers: {
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      expected: "直接圖片",
    },
    {
      name: "🔗 純圖片請求（無瀏覽器context）",
      headers: {
        Accept: "image/*",
        "User-Agent": "ImageDownloader/1.0",
      },
      expected: "直接圖片",
    },
    {
      name: "🤖 API 請求",
      headers: {
        Accept: "application/json",
        "User-Agent": "curl/7.68.0",
      },
      expected: "JSON 回應",
    },
    {
      name: "🔍 搜尋引擎爬蟲",
      headers: {
        Accept: "*/*",
        "User-Agent": "GoogleBot/2.1",
      },
      expected: "預覽頁面 (/p)",
    },
  ];

  for (const scenario of scenarios) {
    try {
      console.log(`\n📝 ${scenario.name}`);
      console.log(`   Accept: ${scenario.headers.Accept}`);
      console.log(
        `   User-Agent: ${scenario.headers["User-Agent"].substring(0, 50)}...`
      );

      const response = await fetch(`${baseUrl}/${testHash}`, {
        method: "GET",
        headers: scenario.headers,
        redirect: "manual",
      });

      if (response.status === 302 || response.status === 307) {
        const location = response.headers.get("location");
        console.log(`   🔀 重定向到: ${location}`);

        if (
          scenario.expected === "預覽頁面 (/p)" &&
          location &&
          location.includes("/p")
        ) {
          console.log(`   ✅ 正確: 瀏覽器請求重定向到預覽頁面`);
        } else if (
          scenario.expected === "直接圖片" &&
          location &&
          !location.includes("/p") &&
          !location.includes("/api/")
        ) {
          console.log(`   ✅ 正確: 圖片請求直接重定向到圖片`);
        } else {
          console.log(
            `   ❌ 錯誤: 預期 ${scenario.expected}，但重定向到 ${location}`
          );
        }
      } else if (response.status === 200) {
        if (scenario.expected === "JSON 回應") {
          const data = await response.json();
          console.log(
            `   📄 JSON 回應: ${JSON.stringify(data).substring(0, 100)}...`
          );
          console.log(`   ✅ 正確: API 請求回傳 JSON`);
        } else {
          console.log(`   ❌ 錯誤: 預期重定向，但回傳 200`);
        }
      } else {
        console.log(`   ❓ 意外狀態: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ 請求失敗: ${error.message}`);
    }
  }

  console.log("\n✅ 測試完成!");
}

// 執行測試
if (require.main === module) {
  const baseUrl = process.argv[2] || "http://localhost:3000";
  const testHash = process.argv[3] || "abc123";

  console.log(`🚀 測試目標: ${baseUrl}/${testHash}\n`);

  testAllScenarios(baseUrl, testHash).catch((error) => {
    console.error("❌ 測試失敗:", error);
    process.exit(1);
  });
}

module.exports = { testAllScenarios };
