/**
 * 上傳防護機制測試腳本
 * 測試所有 API 安全層級的運作
 */

const fs = require('fs');
const FormData = require('form-data');

// 測試設定
const API_URL = 'http://localhost:3000/api/upload';
const TEST_DELAY = 1000; // 測試之間的延遲（毫秒）

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// 測試統計
let testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// 輔助函數：列印測試標題
function printTestHeader(title) {
  console.log(`\n${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}📋 ${title}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

// 輔助函數：列印測試結果
function printTestResult(testName, passed, message = '') {
  testStats.total++;
  if (passed) {
    testStats.passed++;
    console.log(`  ${colors.green}✓ ${testName}${colors.reset}`);
  } else {
    testStats.failed++;
    console.log(`  ${colors.red}✗ ${testName}${colors.reset}`);
  }
  if (message) {
    console.log(`    ${colors.yellow}→ ${message}${colors.reset}`);
  }
}

// 輔助函數：延遲執行
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 生成測試用的小型 PNG 圖片（1x1 pixel）
function createTestImage() {
  // 1x1 透明 PNG 的 Base64 編碼
  const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  return Buffer.from(base64PNG, 'base64');
}

// 生成測試用的大型假檔案
function createLargeFile(sizeInMB) {
  const sizeInBytes = sizeInMB * 1024 * 1024;
  return Buffer.alloc(sizeInBytes, 'a');
}

// 生成測試用的非圖片檔案（文字檔）
function createTextFile() {
  return Buffer.from('This is a text file, not an image!', 'utf-8');
}

// 執行單個上傳測試
async function testUpload(options = {}) {
  const {
    fileBuffer = createTestImage(),
    fileName = 'test.png',
    mimeType = 'image/png',
    headers = {},
    expectSuccess = true,
    testName = 'Upload Test'
  } = options;

  try {
    const formData = new FormData();
    formData.append('image', fileBuffer, {
      filename: fileName,
      contentType: mimeType
    });

    const requestHeaders = {
      ...formData.getHeaders(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'http://localhost:3000',
      'Referer': 'http://localhost:3000/',
      ...headers
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
      headers: requestHeaders
    });

    const responseData = await response.json();
    
    if (expectSuccess) {
      const passed = response.status === 200;
      printTestResult(
        testName,
        passed,
        passed ? 
          `Status: ${response.status}, Response: ${JSON.stringify(responseData).substring(0, 100)}` :
          `Expected success but got status ${response.status}: ${responseData.message || 'Unknown error'}`
      );
      return passed;
    } else {
      const passed = response.status !== 200;
      printTestResult(
        testName,
        passed,
        passed ? 
          `Correctly rejected with status ${response.status}: ${responseData.message || 'Rejected'}` :
          `Expected failure but got success with status ${response.status}`
      );
      return passed;
    }
  } catch (error) {
    printTestResult(
      testName,
      !expectSuccess,
      expectSuccess ? 
        `Error occurred: ${error.message}` :
        `Correctly failed with error: ${error.message}`
    );
    return !expectSuccess;
  }
}

// 測試 1: 正常上傳測試
async function testNormalUpload() {
  printTestHeader('測試 1: 正常上傳');
  
  await testUpload({
    testName: '正常 PNG 圖片上傳',
    expectSuccess: true
  });
  
  await sleep(TEST_DELAY);
}

// 測試 2: Rate Limit 測試
async function testRateLimit() {
  printTestHeader('測試 2: Rate Limit 防護');
  
  console.log(`  ${colors.blue}ℹ 預設限制: 每分鐘 3 次上傳${colors.reset}`);
  
  // 快速連續上傳測試
  for (let i = 1; i <= 5; i++) {
    await testUpload({
      testName: `第 ${i} 次上傳嘗試`,
      expectSuccess: i <= 3 // 前 3 次應該成功，之後應該被阻擋
    });
    
    if (i < 5) {
      await sleep(500); // 短暫延遲以確保請求被處理
    }
  }
  
  console.log(`  ${colors.yellow}⏳ 等待 60 秒讓 Rate Limit 重置...${colors.reset}`);
  await sleep(60000);
  
  await testUpload({
    testName: 'Rate Limit 重置後上傳',
    expectSuccess: true
  });
}

// 測試 3: 檔案大小限制測試
async function testFileSizeLimit() {
  printTestHeader('測試 3: 檔案大小限制');
  
  console.log(`  ${colors.blue}ℹ 預設限制: 5MB${colors.reset}`);
  
  // 測試接近限制的檔案
  await testUpload({
    fileBuffer: createLargeFile(4),
    fileName: 'large_4mb.png',
    testName: '4MB 檔案（應該成功）',
    expectSuccess: true
  });
  
  await sleep(TEST_DELAY);
  
  // 測試超過限制的檔案
  await testUpload({
    fileBuffer: createLargeFile(6),
    fileName: 'large_6mb.png',
    testName: '6MB 檔案（應該被拒絕）',
    expectSuccess: false
  });
  
  await sleep(TEST_DELAY);
}

// 測試 4: 檔案類型驗證測試
async function testFileTypeValidation() {
  printTestHeader('測試 4: 檔案類型驗證');
  
  // 測試允許的圖片格式
  const allowedTypes = [
    { ext: 'png', mime: 'image/png', buffer: createTestImage() },
    { ext: 'jpg', mime: 'image/jpeg', buffer: createTestImage() },
    { ext: 'gif', mime: 'image/gif', buffer: createTestImage() },
    { ext: 'webp', mime: 'image/webp', buffer: createTestImage() }
  ];
  
  for (const type of allowedTypes) {
    await testUpload({
      fileBuffer: type.buffer,
      fileName: `test.${type.ext}`,
      mimeType: type.mime,
      testName: `${type.ext.toUpperCase()} 格式（應該允許）`,
      expectSuccess: true
    });
    await sleep(TEST_DELAY);
  }
  
  // 測試不允許的格式
  await testUpload({
    fileBuffer: createTextFile(),
    fileName: 'test.txt',
    mimeType: 'text/plain',
    testName: 'TXT 檔案（應該被拒絕）',
    expectSuccess: false
  });
  
  await sleep(TEST_DELAY);
  
  // 測試偽裝的檔案（錯誤的 MIME 類型）
  await testUpload({
    fileBuffer: createTextFile(),
    fileName: 'fake.png',
    mimeType: 'image/png',
    testName: '偽裝成 PNG 的文字檔（應該被拒絕）',
    expectSuccess: false
  });
  
  await sleep(TEST_DELAY);
}

// 測試 5: Origin/Referer 檢查測試
async function testOriginCheck() {
  printTestHeader('測試 5: Origin/Referer 檢查');
  
  console.log(`  ${colors.blue}ℹ 在開發環境中，Origin 檢查可能被放寬${colors.reset}`);
  
  // 測試有效的 Origin
  await testUpload({
    headers: {
      'Origin': 'http://localhost:3000',
      'Referer': 'http://localhost:3000/upload'
    },
    testName: '有效的 Origin/Referer',
    expectSuccess: true
  });
  
  await sleep(TEST_DELAY);
  
  // 測試無效的 Origin（在生產環境會被拒絕）
  await testUpload({
    headers: {
      'Origin': 'http://malicious-site.com',
      'Referer': 'http://malicious-site.com/attack'
    },
    testName: '無效的 Origin（開發環境可能允許）',
    expectSuccess: true // 開發環境預設允許
  });
  
  await sleep(TEST_DELAY);
  
  // 測試沒有 Origin/Referer
  await testUpload({
    headers: {
      'Origin': null,
      'Referer': null
    },
    testName: '沒有 Origin/Referer（開發環境可能允許）',
    expectSuccess: true // 開發環境預設允許
  });
  
  await sleep(TEST_DELAY);
}

// 測試 6: User-Agent 檢查測試
async function testUserAgentCheck() {
  printTestHeader('測試 6: User-Agent 檢查');
  
  console.log(`  ${colors.blue}ℹ User-Agent 檢查可能需要在環境變數中啟用${colors.reset}`);
  
  // 測試正常的瀏覽器 User-Agent
  await testUpload({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    testName: '正常瀏覽器 User-Agent',
    expectSuccess: true
  });
  
  await sleep(TEST_DELAY);
  
  // 測試 Bot User-Agent
  await testUpload({
    headers: {
      'User-Agent': 'curl/7.64.1'
    },
    testName: 'Curl User-Agent（可能被阻擋）',
    expectSuccess: false
  });
  
  await sleep(TEST_DELAY);
  
  // 測試爬蟲 User-Agent
  await testUpload({
    headers: {
      'User-Agent': 'python-requests/2.28.0'
    },
    testName: 'Python Requests（可能被阻擋）',
    expectSuccess: false
  });
  
  await sleep(TEST_DELAY);
  
  // 測試空 User-Agent
  await testUpload({
    headers: {
      'User-Agent': ''
    },
    testName: '空 User-Agent（可能被阻擋）',
    expectSuccess: false
  });
  
  await sleep(TEST_DELAY);
}

// 測試 7: 綜合安全測試
async function testSecurityCombination() {
  printTestHeader('測試 7: 綜合安全測試');
  
  // 測試多重違規
  await testUpload({
    fileBuffer: createLargeFile(10),
    fileName: 'malicious.exe',
    mimeType: 'application/x-msdownload',
    headers: {
      'User-Agent': 'bot/1.0',
      'Origin': 'http://evil.com'
    },
    testName: '多重違規（大檔案 + 錯誤類型 + 可疑 UA）',
    expectSuccess: false
  });
  
  await sleep(TEST_DELAY);
}

// 列印測試總結
function printSummary() {
  console.log(`\n${colors.magenta}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.magenta}${colors.bold}📊 測試總結${colors.reset}`);
  console.log(`${colors.magenta}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  console.log(`\n  總測試數: ${colors.bold}${testStats.total}${colors.reset}`);
  console.log(`  ${colors.green}✓ 通過: ${testStats.passed}${colors.reset}`);
  console.log(`  ${colors.red}✗ 失敗: ${testStats.failed}${colors.reset}`);
  
  const passRate = ((testStats.passed / testStats.total) * 100).toFixed(1);
  const passRateColor = passRate >= 80 ? colors.green : passRate >= 60 ? colors.yellow : colors.red;
  console.log(`  ${passRateColor}通過率: ${passRate}%${colors.reset}`);
  
  if (testStats.failed > 0) {
    console.log(`\n  ${colors.yellow}⚠ 有 ${testStats.failed} 個測試失敗，請檢查防護機制設定${colors.reset}`);
  } else {
    console.log(`\n  ${colors.green}✨ 所有測試都通過！防護機制運作正常${colors.reset}`);
  }
  
  // 安全建議
  console.log(`\n${colors.cyan}${colors.bold}🔒 安全建議：${colors.reset}`);
  console.log(`  1. 確保生產環境啟用所有防護機制`);
  console.log(`  2. 定期檢查和更新 IP 黑名單`);
  console.log(`  3. 監控異常上傳模式`);
  console.log(`  4. 考慮實作 CAPTCHA 進一步防護`);
  console.log(`  5. 使用 CDN 或 WAF 提供額外保護層`);
}

// 主測試函數
async function runAllTests() {
  console.log(`${colors.cyan}${colors.bold}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║           上傳 API 防護機制完整測試腳本                   ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  console.log(`\n${colors.yellow}⚠ 注意事項：${colors.reset}`);
  console.log(`  • 請確保開發伺服器正在運行於 http://localhost:3000`);
  console.log(`  • 某些測試在開發環境可能會有不同的行為`);
  console.log(`  • Rate Limit 測試會需要等待 60 秒重置`);
  console.log(`  • 完整測試大約需要 2-3 分鐘`);
  
  console.log(`\n${colors.green}▶ 開始執行測試...${colors.reset}`);
  
  try {
    // 檢查伺服器是否運行
    console.log(`\n${colors.blue}檢查伺服器狀態...${colors.reset}`);
    const healthCheck = await fetch('http://localhost:3000').catch(() => null);
    if (!healthCheck) {
      console.error(`${colors.red}❌ 無法連接到伺服器！請確保開發伺服器正在運行${colors.reset}`);
      process.exit(1);
    }
    console.log(`${colors.green}✓ 伺服器正常運行${colors.reset}`);
    
    // 執行所有測試
    await testNormalUpload();
    await testFileSizeLimit();
    await testFileTypeValidation();
    await testOriginCheck();
    await testUserAgentCheck();
    await testSecurityCombination();
    
    // Rate Limit 測試放在最後，因為需要等待
    const runRateLimitTest = process.argv.includes('--full') || process.argv.includes('--rate-limit');
    if (runRateLimitTest) {
      await testRateLimit();
    } else {
      console.log(`\n${colors.yellow}ℹ Rate Limit 測試已跳過（需要等待 60 秒）${colors.reset}`);
      console.log(`  使用 'node test-upload-protection.js --full' 執行完整測試`);
    }
    
  } catch (error) {
    console.error(`\n${colors.red}測試執行時發生錯誤：${error.message}${colors.reset}`);
    console.error(error);
  }
  
  // 列印總結
  printSummary();
}

// 執行測試
runAllTests().catch(console.error);