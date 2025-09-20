// 測試 middleware 智能路由修復
const { default: fetch } = require("node-fetch");

async function testMiddleware() {
  const baseUrl = "http://localhost:3001";
  const testHash = "MRgWwA"; // 我們剛創建的測試 hash

  console.log("🔧 測試智能路由修復...\n");

  // 測試 1: 瀏覽器請求應該重定向到預覽頁
  console.log("1. 測試瀏覽器請求:");
  try {
    const response = await fetch(`${baseUrl}/${testHash}`, {
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

  // 測試 2: 圖片請求應該直接重定向到圖片
  console.log("2. 測試圖片請求:");
  try {
    const response = await fetch(`${baseUrl}/${testHash}`, {
      headers: {
        Accept: "image/webp,image/*",
        "User-Agent": "ImageFetcher/1.0",
      },
      redirect: "manual",
    });

    console.log(`   狀態碼: ${response.status}`);
    console.log(`   重定向: ${response.headers.get("location") || "無"}`);
    console.log("");
  } catch (error) {
    console.log(`   錯誤: ${error.message}\n`);
  }

  // 測試 3: 直接參數請求
  console.log("3. 測試直接參數請求:");
  try {
    const response = await fetch(`${baseUrl}/${testHash}?direct=true`, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0",
      },
      redirect: "manual",
    });

    console.log(`   狀態碼: ${response.status}`);
    console.log(`   重定向: ${response.headers.get("location") || "無"}`);
    console.log("");
  } catch (error) {
    console.log(`   錯誤: ${error.message}\n`);
  }

  // 測試 4: API 請求
  console.log("4. 測試 API 請求:");
  try {
    const response = await fetch(`${baseUrl}/api/mapping/${testHash}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "API-Client/1.0",
      },
    });

    console.log(`   狀態碼: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   回應: ${JSON.stringify(data, null, 2)}`);
    }
    console.log("");
  } catch (error) {
    console.log(`   錯誤: ${error.message}\n`);
  }

  console.log("✅ 智能路由測試完成");
}

testMiddleware().catch(console.error);
