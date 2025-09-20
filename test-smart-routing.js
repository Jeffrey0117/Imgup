// 智能路由測試腳本
const { default: fetch } = require("node-fetch");

async function testSmartRouting() {
  const baseUrl = "http://localhost:3002";
  const testHash = "test123456";

  console.log("🔍 測試智能路由功能...\n");

  // 測試 1: 瀏覽器請求 (Accept: text/html)
  console.log("1. 測試瀏覽器請求 (Accept: text/html)");
  try {
    const response = await fetch(`${baseUrl}/api/mapping/${testHash}`, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      redirect: "manual",
    });

    console.log(`   狀態碼: ${response.status}`);
    console.log(`   重定向: ${response.headers.get("location") || "無"}`);
    console.log("");
  } catch (error) {
    console.log(`   錯誤: ${error.message}\n`);
  }

  // 測試 2: 圖片請求 (Accept: image/*)
  console.log("2. 測試圖片請求 (Accept: image/*)");
  try {
    const response = await fetch(`${baseUrl}/api/mapping/${testHash}`, {
      headers: {
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; Imagebot/1.0)",
      },
      redirect: "manual",
    });

    console.log(`   狀態碼: ${response.status}`);
    console.log(`   重定向: ${response.headers.get("location") || "無"}`);
    console.log("");
  } catch (error) {
    console.log(`   錯誤: ${error.message}\n`);
  }

  // 測試 3: API 請求 (Accept: application/json)
  console.log("3. 測試 API 請求 (Accept: application/json)");
  try {
    const response = await fetch(`${baseUrl}/api/mapping/${testHash}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Node.js/Test",
      },
    });

    console.log(`   狀態碼: ${response.status}`);
    console.log(
      `   Content-Type: ${response.headers.get("content-type") || "無"}`
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`   回應: ${JSON.stringify(data)}`);
    }
    console.log("");
  } catch (error) {
    console.log(`   錯誤: ${error.message}\n`);
  }

  // 測試 4: 直接參數請求
  console.log("4. 測試直接參數請求 (?direct=true)");
  try {
    const response = await fetch(
      `${baseUrl}/api/mapping/${testHash}?direct=true`,
      {
        headers: {
          Accept: "text/html",
          "User-Agent": "Mozilla/5.0",
        },
        redirect: "manual",
      }
    );

    console.log(`   狀態碼: ${response.status}`);
    console.log(`   重定向: ${response.headers.get("location") || "無"}`);
    console.log("");
  } catch (error) {
    console.log(`   錯誤: ${error.message}\n`);
  }

  console.log("✅ 智能路由測試完成");
}

testSmartRouting().catch(console.error);
