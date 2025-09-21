import fetch from "node-fetch";
import fs from "node:fs";

async function testAdminLoginPage() {
  console.log("🧪 開始測試 admin/login 頁面...\n");

  try {
    // 測試頁面訪問
    console.log("📡 測試頁面訪問: http://localhost:3001/admin/login");
    const response = await fetch("http://localhost:3001/admin/login", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    console.log(`📊 HTTP 狀態碼: ${response.status}`);
    console.log(`🔗 Content-Type: ${response.headers.get("content-type")}`);

    if (!response.ok) {
      console.log("❌ 頁面訪問失敗");
      return false;
    }

    // 獲取頁面內容
    const html = await response.text();

    // 將實際輸出的 HTML 與回應標頭寫入檔案，便於除錯
    try {
      fs.writeFileSync("admin-login-source.html", html, "utf8");
      const headersDump = [...response.headers.entries()]
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      fs.writeFileSync("admin-login-headers.txt", headersDump, "utf8");
    } catch (e) {
      console.log(
        "⚠️ 無法寫入 admin-login-source.html/admin-login-headers.txt：",
        e.message
      );
    }

    console.log("\n📄 頁面載入成功");

    // 檢查是否包含必要的元素
    // 注意：Next.js 使用 CSS Module 會將類名編譯為「檔名_類名__hash」
    // 例如本頁面 page.module.css -> 會出現 "page_container__xxxx" 這類字樣
    const checks = [
      { name: "HTML 結構", pattern: /<html|<html/i, required: true },
      {
        name: "CSS Module 類名渲染",
        pattern: /class="[^"]*page_/i,
        required: true,
      },
      { name: "管理員登入標題", pattern: /管理員登入/, required: true },
      { name: "登入表單", pattern: /<form|<form/i, required: true },
      { name: "電子郵件輸入", pattern: /電子郵件地址/, required: true },
      { name: "密碼輸入", pattern: /密碼/, required: true },
      { name: "登入按鈕", pattern: /登入/, required: true },
    ];

    console.log("\n🔍 內容檢查結果:");
    let allPassed = true;

    checks.forEach((check) => {
      const passed = check.pattern.test(html);
      const status = passed ? "✅" : "❌";
      console.log(`  ${status} ${check.name}`);

      if (check.required && !passed) {
        allPassed = false;
      }
    });

    // 檢查 CSS 載入
    console.log("\n🎨 CSS 檢查:");
    const hasHashedClass = /class="[^"]*page_/i.test(html);
    const hasStyleTag = /<style/i.test(html);
    console.log(`${hasHashedClass ? "✅" : "❌"} CSS Module 類名渲染 (page_*)`);
    console.log(`${hasStyleTag ? "✅" : "❌"} 內聯樣式標籤存在`);

    // 檢查是否有明顯的錯誤（避免將 dev 內嵌腳本中的 "Error" 字樣誤判）
    const hasErrors =
      /(?:500 Internal|Application error|TypeError:|ReferenceError:)/i.test(
        html
      );
    if (hasErrors) {
      console.log("❌ 頁面包含錯誤信息（狀態碼 500 或明確的 JS 錯誤字樣）");
      allPassed = false;
    }

    // 總結
    console.log("\n📋 測試總結:");
    console.log(
      `${allPassed ? "✅" : "❌"} 整體測試結果: ${allPassed ? "通過" : "失敗"}`
    );

    if (allPassed) {
      console.log("🎉 頁面載入正常，CSS 模組運作良好");
    } else {
      console.log("⚠️  發現問題，請檢查上述失敗的項目");
    }

    return allPassed;
  } catch (error) {
    console.log("❌ 測試過程中發生錯誤:");
    console.log(error.message);

    // 檢查是否是連線錯誤
    if (error.code === "ECONNREFUSED") {
      console.log(
        "💡 提示: 請確認 Next.js 開發服務器是否在 localhost:3001 上運行"
      );
    }

    return false;
  }
}

// 執行測試
testAdminLoginPage();
