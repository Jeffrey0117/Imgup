/**
 * 測試 API 安全機制
 * 測試項目：
 * 1. 請求來源驗證
 * 2. DevTools 偵測
 * 3. 速率限制
 * 4. 自動化工具偵測
 */

const BASE_URL = 'http://localhost:3000';

// 顏色輸出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 測試 1：正常登入請求
async function testNormalLogin() {
  log('\n測試 1：正常登入請求', 'blue');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/admin/login',
      },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log('✓ 正常登入成功', 'green');
      log(`  回應: ${JSON.stringify(data)}`, 'green');
    } else {
      log(`✗ 登入失敗: ${data.error}`, 'red');
    }
    
    return response.ok;
  } catch (error) {
    log(`✗ 請求失敗: ${error.message}`, 'red');
    return false;
  }
}

// 測試 2：無效來源請求
async function testInvalidOrigin() {
  log('\n測試 2：無效來源請求', 'blue');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://malicious-site.com',
        'Referer': 'http://malicious-site.com/attack',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    
    if (response.status === 403) {
      log('✓ 成功阻擋無效來源', 'green');
      log(`  錯誤訊息: ${data.error}`, 'green');
      return true;
    } else {
      log('✗ 未能阻擋無效來源', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ 測試失敗: ${error.message}`, 'red');
    return false;
  }
}

// 測試 3：自動化工具偵測
async function testAutomationDetection() {
  log('\n測試 3：自動化工具偵測', 'blue');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'User-Agent': 'Mozilla/5.0 (compatible; Puppeteer)',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    
    if (response.status === 403) {
      log('✓ 成功偵測自動化工具', 'green');
      log(`  錯誤訊息: ${data.error}`, 'green');
      return true;
    } else {
      log('✗ 未能偵測自動化工具', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ 測試失敗: ${error.message}`, 'red');
    return false;
  }
}

// 測試 4：速率限制
async function testRateLimit() {
  log('\n測試 4：速率限制 (連續 6 次請求)', 'blue');
  
  let blockedAt = 0;
  
  for (let i = 1; i <= 6; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
          'X-Forwarded-For': '192.168.1.100', // 模擬相同 IP
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'wrongpassword' // 故意使用錯誤密碼
        })
      });
      
      const data = await response.json();
      
      if (response.status === 429) {
        log(`  請求 ${i}: 被速率限制阻擋`, 'yellow');
        blockedAt = i;
        break;
      } else {
        log(`  請求 ${i}: 狀態 ${response.status}`, 'yellow');
      }
    } catch (error) {
      log(`  請求 ${i} 失敗: ${error.message}`, 'red');
    }
  }
  
  if (blockedAt > 0 && blockedAt <= 5) {
    log(`✓ 速率限制生效，在第 ${blockedAt} 次請求時阻擋`, 'green');
    return true;
  } else if (blockedAt === 6) {
    log(`✓ 速率限制生效，在第 6 次請求時阻擋`, 'green');
    return true;
  } else {
    log('✗ 速率限制未生效', 'red');
    return false;
  }
}

// 測試 5：檢查回應時間隨機性
async function testResponseTimeRandomness() {
  log('\n測試 5：回應時間隨機性', 'blue');
  
  const times = [];
  
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    
    try {
      await fetch(`${BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'test123'
        })
      });
      
      const elapsed = Date.now() - start;
      times.push(elapsed);
      log(`  請求 ${i + 1} 耗時: ${elapsed}ms`, 'yellow');
    } catch (error) {
      log(`  請求 ${i + 1} 失敗: ${error.message}`, 'red');
    }
  }
  
  // 檢查時間是否有變化（表示有隨機延遲）
  const hasVariation = times.length > 1 && 
    Math.max(...times) - Math.min(...times) > 20;
  
  if (hasVariation) {
    log('✓ 偵測到隨機延遲（防時序分析）', 'green');
    return true;
  } else {
    log('⚠ 未偵測到明顯的隨機延遲', 'yellow');
    return false;
  }
}

// 執行所有測試
async function runAllTests() {
  log('\n========================================', 'blue');
  log('開始執行 API 安全機制測試', 'blue');
  log('========================================', 'blue');
  
  const results = [];
  
  // 執行測試
  results.push(await testNormalLogin());
  results.push(await testInvalidOrigin());
  results.push(await testAutomationDetection());
  results.push(await testRateLimit());
  results.push(await testResponseTimeRandomness());
  
  // 總結
  log('\n========================================', 'blue');
  log('測試總結', 'blue');
  log('========================================', 'blue');
  
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  
  log(`通過: ${passed} 個測試`, 'green');
  log(`失敗: ${failed} 個測試`, failed > 0 ? 'red' : 'green');
  
  if (failed === 0) {
    log('\n✓ 所有安全機制測試通過！', 'green');
  } else {
    log('\n✗ 部分測試失敗，請檢查安全機制實作', 'red');
  }
}

// 執行測試
runAllTests().catch(error => {
  log(`\n測試執行失敗: ${error.message}`, 'red');
  process.exit(1);
});