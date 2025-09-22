/**
 * 簡化版上傳防護測試腳本
 * 不需要額外套件，使用原生 Node.js
 */

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// 測試統計
let testStats = {
  total: 0,
  passed: 0,
  failed: 0
};

// 輔助函數
function printHeader(title) {
  console.log(`\n${colors.cyan}${colors.bold}━━━ ${title} ━━━${colors.reset}`);
}

function printResult(name, passed, message = '') {
  testStats.total++;
  if (passed) {
    testStats.passed++;
    console.log(`  ${colors.green}✓ ${name}${colors.reset}`);
  } else {
    testStats.failed++;
    console.log(`  ${colors.red}✗ ${name}${colors.reset}`);
  }
  if (message) {
    console.log(`    ${colors.yellow}→ ${message}${colors.reset}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 生成 multipart/form-data 邊界
function generateBoundary() {
  return '----FormBoundary' + Math.random().toString(36).substring(2, 15);
}

// 建立 multipart/form-data 內容
function createFormData(boundary, fieldName, fileName, fileContent, mimeType) {
  const parts = [];
  
  parts.push(`--${boundary}`);
  parts.push(`Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"`);
  parts.push(`Content-Type: ${mimeType}`);
  parts.push('');
  parts.push(fileContent);
  parts.push(`--${boundary}--`);
  
  return parts.join('\r\n');
}

// 1x1 透明 PNG (Base64)
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// 執行上傳測試
async function testUpload(options = {}) {
  const {
    fileContent = Buffer.from(TINY_PNG_BASE64, 'base64'),
    fileName = 'test.png',
    mimeType = 'image/png',
    headers = {},
    expectSuccess = true,
    testName = 'Upload Test'
  } = options;
  
  try {
    const boundary = generateBoundary();
    const body = createFormData(boundary, 'image', fileName, fileContent, mimeType);
    
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/',
        ...headers
      },
      body: body
    });
    
    const data = await response.json();
    
    if (expectSuccess) {
      const passed = response.status === 200;
      printResult(
        testName,
        passed,
        passed ? `成功 (${response.status})` : `失敗: ${data.message || response.status}`
      );
      return passed;
    } else {
      const passed = response.status !== 200;
      printResult(
        testName,
        passed,
        passed ? `正確拒絕 (${response.status}): ${data.message}` : `錯誤: 應該失敗但成功了`
      );
      return passed;
    }
  } catch (error) {
    printResult(
      testName,
      !expectSuccess,
      expectSuccess ? `錯誤: ${error.message}` : `正確失敗: ${error.message}`
    );
    return !expectSuccess;
  }
}

// 主測試程式
async function runTests() {
  console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║    上傳 API 防護機制快速測試             ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════════╝${colors.reset}`);
  
  // 檢查伺服器
  try {
    const check = await fetch('http://localhost:3000');
    console.log(`${colors.green}✓ 伺服器運行中${colors.reset}`);
  } catch (e) {
    console.error(`${colors.red}❌ 無法連接伺服器！請先執行 npm run dev${colors.reset}`);
    return;
  }
  
  // 測試 1: 正常上傳
  printHeader('測試 1: 正常上傳');
  await testUpload({
    testName: '合法的 PNG 圖片',
    expectSuccess: true
  });
  
  await sleep(1000);
  
  // 測試 2: 檔案大小
  printHeader('測試 2: 檔案大小限制');
  
  // 建立 6MB 的假資料
  const largeFile = Buffer.alloc(6 * 1024 * 1024, 'a');
  await testUpload({
    fileContent: largeFile,
    fileName: 'large.png',
    testName: '6MB 超大檔案',
    expectSuccess: false
  });
  
  await sleep(1000);
  
  // 測試 3: 錯誤檔案類型
  printHeader('測試 3: 檔案類型驗證');
  
  await testUpload({
    fileContent: Buffer.from('This is text, not image'),
    fileName: 'test.txt',
    mimeType: 'text/plain',
    testName: '文字檔案',
    expectSuccess: false
  });
  
  await sleep(1000);
  
  // 測試 4: 偽裝檔案
  await testUpload({
    fileContent: Buffer.from('Not a real PNG'),
    fileName: 'fake.png',
    mimeType: 'image/png',
    testName: '偽裝的 PNG',
    expectSuccess: false
  });
  
  await sleep(1000);
  
  // 測試 5: User-Agent
  printHeader('測試 4: User-Agent 檢查');
  
  await testUpload({
    headers: { 'User-Agent': 'curl/7.64.1' },
    testName: 'Curl UA (可能被阻擋)',
    expectSuccess: false
  });
  
  await testUpload({
    headers: { 'User-Agent': '' },
    testName: '空 User-Agent',
    expectSuccess: false
  });
  
  await sleep(1000);
  
  // 測試 6: Rate Limit (簡化版)
  printHeader('測試 5: Rate Limit (快速版)');
  console.log(`  ${colors.blue}連續發送 5 個請求...${colors.reset}`);
  
  for (let i = 1; i <= 5; i++) {
    await testUpload({
      testName: `請求 #${i}`,
      expectSuccess: i <= 3 // 預設前 3 個成功
    });
    await sleep(200);
  }
  
  // 總結
  console.log(`\n${colors.magenta}${colors.bold}━━━ 測試總結 ━━━${colors.reset}`);
  console.log(`  總數: ${testStats.total}`);
  console.log(`  ${colors.green}通過: ${testStats.passed}${colors.reset}`);
  console.log(`  ${colors.red}失敗: ${testStats.failed}${colors.reset}`);
  
  const rate = ((testStats.passed / testStats.total) * 100).toFixed(1);
  console.log(`  通過率: ${rate}%`);
  
  if (testStats.failed === 0) {
    console.log(`\n${colors.green}✨ 所有測試通過！${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠ 部分測試失敗，請檢查設定${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}提示：${colors.reset}`);
  console.log('• 某些防護在開發環境可能被放寬');
  console.log('• 使用 test-upload-protection.js 進行完整測試');
  console.log('• 確保生產環境啟用所有防護機制');
}

// 執行
runTests().catch(console.error);