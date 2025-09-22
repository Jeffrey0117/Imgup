import { NextRequest } from 'next/server';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  requests: number;
  resetTime: number;
  cooldownMultiplier?: number;
}

// 記憶體儲存（生產環境建議使用 Redis）
const memoryStore = new Map<string, RateLimitStore>();

// IP 黑名單（可從環境變數或資料庫載入）
const blacklistedIPs = new Set<string>(
  process.env.IP_BLACKLIST?.split(',').map(ip => ip.trim()) || []
);

// IP 白名單（可從環境變數或資料庫載入）
const whitelistedIPs = new Set<string>(
  process.env.IP_WHITELIST?.split(',').map(ip => ip.trim()) || []
);

// 惡意 User-Agent 模式
const maliciousUserAgentPatterns = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /wget/i,
  /curl/i,
  /python/i,
  /java/i,
  /ruby/i,
  /perl/i,
  /php/i,
  /go-http-client/i,
];

/**
 * 獲取客戶端 IP
 */
export function getClientIP(req: NextRequest): string {
  // 優先使用 X-Forwarded-For（在代理後面時）
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // 取第一個 IP（原始客戶端 IP）
    return forwardedFor.split(',')[0].trim();
  }

  // 其他可能的 header
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Cloudflare
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // 預設返回 127.0.0.1
  return '127.0.0.1';
}

/**
 * 檢查 IP 是否在黑名單中
 */
export function isIPBlacklisted(ip: string): boolean {
  return blacklistedIPs.has(ip);
}

/**
 * 檢查 IP 是否在白名單中
 */
export function isIPWhitelisted(ip: string): boolean {
  // 開發環境永遠在白名單
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // localhost 永遠在白名單
  if (ip === '127.0.0.1' || ip === '::1') {
    return true;
  }
  
  return whitelistedIPs.has(ip);
}

/**
 * 檢查 User-Agent 是否可疑
 */
export function isSuspiciousUserAgent(userAgent: string | null): boolean {
  if (!userAgent) {
    return true; // 沒有 User-Agent 視為可疑
  }

  // 檢查是否匹配惡意模式
  for (const pattern of maliciousUserAgentPatterns) {
    if (pattern.test(userAgent)) {
      // 例外：允許某些合法的 bot
      if (userAgent.includes('Googlebot') || 
          userAgent.includes('Bingbot') || 
          userAgent.includes('Slackbot')) {
        return false;
      }
      return true;
    }
  }

  // User-Agent 太短也視為可疑
  if (userAgent.length < 10) {
    return true;
  }

  return false;
}

/**
 * 清理過期的記錄
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  // 使用 Array.from 轉換為陣列，避免 TypeScript es5 target 的迭代器問題
  const entries = Array.from(memoryStore.entries());
  for (const [key, record] of entries) {
    if (record.resetTime <= now) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Rate Limit 中介軟體
 */
export function createRateLimiter(config: RateLimitConfig) {
  // 定期清理過期記錄（每分鐘一次）
  setInterval(cleanupExpiredRecords, 60000);

  return async function rateLimit(req: NextRequest): Promise<{ 
    allowed: boolean; 
    reason?: string;
    retryAfter?: number;
  }> {
    // 獲取識別符（預設使用 IP）
    const identifier = config.identifier ? config.identifier(req) : getClientIP(req);
    
    // 檢查 IP 黑名單
    if (isIPBlacklisted(identifier)) {
      console.log(`[RateLimit] Blocked blacklisted IP: ${identifier}`);
      return { allowed: false, reason: 'Access denied' };
    }

    // 檢查 IP 白名單（白名單內的 IP 不受限制）
    if (isIPWhitelisted(identifier)) {
      return { allowed: true };
    }

    // 檢查 User-Agent
    const userAgent = req.headers.get('user-agent');
    if (process.env.ENABLE_USER_AGENT_CHECK === 'true' && isSuspiciousUserAgent(userAgent)) {
      console.log(`[RateLimit] Blocked suspicious User-Agent: ${userAgent} from ${identifier}`);
      return { allowed: false, reason: 'Invalid client' };
    }

    const now = Date.now();
    let record = memoryStore.get(identifier);

    // 如果記錄不存在或已過期，建立新記錄
    if (!record || record.resetTime <= now) {
      record = {
        requests: 1,
        resetTime: now + config.windowMs,
        cooldownMultiplier: 1
      };
      memoryStore.set(identifier, record);
      return { allowed: true };
    }

    // 增加請求計數
    record.requests++;

    // 檢查是否超過限制
    if (record.requests > config.maxRequests) {
      // 計算冷卻時間（指數遞增）
      const cooldownMultiplier = record.cooldownMultiplier || 1;
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      
      // 如果持續違規，增加冷卻倍數
      if (record.requests === config.maxRequests + 1) {
        record.cooldownMultiplier = Math.min((cooldownMultiplier * 2), 64); // 最多 64 倍
        record.resetTime = now + (config.windowMs * record.cooldownMultiplier);
      }

      console.log(`[RateLimit] Rate limit exceeded for ${identifier}: ${record.requests}/${config.maxRequests}, cooldown: ${cooldownMultiplier}x`);
      
      return { 
        allowed: false, 
        reason: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      };
    }

    return { allowed: true };
  };
}

/**
 * 預設的上傳端點 Rate Limiter
 */
export const uploadRateLimiter = createRateLimiter({
  maxRequests: parseInt(process.env.UPLOAD_RATE_LIMIT_PER_MINUTE || '3'),
  windowMs: 60 * 1000, // 1 分鐘
});

/**
 * API 通用 Rate Limiter（較寬鬆）
 */
export const apiRateLimiter = createRateLimiter({
  maxRequests: parseInt(process.env.API_RATE_LIMIT_PER_MINUTE || '60'),
  windowMs: 60 * 1000, // 1 分鐘
});

/**
 * 嚴格的 Rate Limiter（用於敏感操作）
 */
export const strictRateLimiter = createRateLimiter({
  maxRequests: parseInt(process.env.STRICT_RATE_LIMIT_PER_MINUTE || '3'),
  windowMs: 60 * 1000, // 1 分鐘
});