import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * API 安全防護工具
 * 防止前端 DevTools 直接觀察和濫用 API
 */

// 生成請求簽名密鑰（應該存在環境變數）
const API_SIGNATURE_KEY = process.env.API_SIGNATURE_KEY || 'default-dev-key-change-in-production';

/**
 * 驗證請求來源是否合法
 */
export function validateRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // 開發環境放寬限制
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // 檢查 Origin 或 Referer
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_BASE_URL,
    'https://duk.tw',
    'https://www.duk.tw',
  ].filter(Boolean);
  
  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }
  
  if (referer) {
    return allowedOrigins.some(allowed => referer.startsWith(allowed || ''));
  }
  
  return false;
}

/**
 * 生成 API 請求簽名
 */
export function generateApiSignature(
  method: string,
  path: string,
  timestamp: number,
  body?: any
): string {
  const payload = JSON.stringify({
    method,
    path,
    timestamp,
    body: body ? JSON.stringify(body) : '',
  });
  
  return crypto
    .createHmac('sha256', API_SIGNATURE_KEY)
    .update(payload)
    .digest('hex');
}

/**
 * 驗證 API 請求簽名
 */
export function validateApiSignature(
  request: NextRequest,
  body?: any
): boolean {
  const signature = request.headers.get('x-api-signature');
  const timestamp = request.headers.get('x-api-timestamp');
  
  // 開發環境可選擇性跳過
  if (process.env.NODE_ENV === 'development' && !signature) {
    return true;
  }
  
  if (!signature || !timestamp) {
    return false;
  }
  
  // 檢查時間戳（防止重放攻擊，5分鐘內有效）
  const requestTime = parseInt(timestamp);
  const currentTime = Date.now();
  if (Math.abs(currentTime - requestTime) > 5 * 60 * 1000) {
    return false;
  }
  
  // 計算預期簽名
  const expectedSignature = generateApiSignature(
    request.method,
    request.nextUrl.pathname,
    requestTime,
    body
  );
  
  // 使用時間恆定比較防止時序攻擊
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * 檢查是否為自動化工具（如 Puppeteer、Selenium）
 */
export function detectAutomation(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  
  // 檢查常見自動化工具特徵
  const automationPatterns = [
    /headless/i,
    /phantom/i,
    /puppeteer/i,
    /selenium/i,
    /webdriver/i,
    /crawl/i,
    /bot/i,
    /spider/i,
  ];
  
  return automationPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * 混淆敏感資料
 */
export function obfuscateSensitiveData(data: any): any {
  if (!data) return data;
  
  // 在生產環境混淆某些欄位
  if (process.env.NODE_ENV === 'production') {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];
    
    if (typeof data === 'object') {
      const obfuscated = { ...data };
      
      for (const field of sensitiveFields) {
        if (field in obfuscated && obfuscated[field]) {
          // 保留前後各2個字元，中間用星號
          const value = String(obfuscated[field]);
          if (value.length > 4) {
            obfuscated[field] = value.slice(0, 2) + '***' + value.slice(-2);
          } else {
            obfuscated[field] = '****';
          }
        }
      }
      
      return obfuscated;
    }
  }
  
  return data;
}

/**
 * 防 DevTools 偵測（前端使用）
 * 注意：這只是輔助措施，不能完全依賴
 */
export const antiDevToolsScript = `
(function() {
  // 偵測 DevTools 開啟
  let devtools = {open: false, orientation: null};
  const threshold = 160;
  
  setInterval(function() {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devtools.open) {
        devtools.open = true;
        // 可選：記錄或採取行動
        console.warn('DevTools detected');
        // 可選：限制 API 呼叫
        window.__DEV_TOOLS_OPEN__ = true;
      }
    } else {
      devtools.open = false;
      window.__DEV_TOOLS_OPEN__ = false;
    }
  }, 500);
  
  // 禁用右鍵選單（可選）
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('contextmenu', e => e.preventDefault());
  }
  
  // 禁用 F12 和其他開發者快捷鍵（可選）
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U')) {
      if (process.env.NODE_ENV === 'production') {
        e.preventDefault();
        return false;
      }
    }
  });
})();
`;

/**
 * 生成隨機延遲（防止時序分析）
 */
export function getRandomDelay(): number {
  return Math.floor(Math.random() * 100) + 50; // 50-150ms
}

/**
 * API 速率限制（簡單實作）
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || record.resetTime < now) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * 生成假資料（用於混淆真實 API）
 */
export function generateDummyResponse(): any {
  return {
    success: true,
    data: {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now(),
      message: 'Request processed',
      // 加入一些隨機資料混淆
      _noise: crypto.randomBytes(32).toString('base64'),
    },
  };
}