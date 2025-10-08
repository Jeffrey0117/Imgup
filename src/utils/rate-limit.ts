import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export enum UserTier {
  GUEST = 'guest',
  MEMBER = 'member',
  PREMIUM = 'premium'
}

export enum ViolationSeverity {
  WARNING = 'warning',
  RESTRICTION = 'restriction',
  BLACKLIST = 'blacklist'
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  tierLimits?: {
    guest: number;
    member: number;
    premium: number;
  };
}

interface RateLimitStore {
  requests: number;
  resetTime: number;
  cooldownMultiplier?: number;
  warningCount?: number;
}

interface UserContext {
  userId?: string;
  tier: UserTier;
  isRestricted: boolean;
  isBlacklisted: boolean;
  restrictedUntil?: Date;
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

export async function getUserContext(req: NextRequest): Promise<UserContext> {
  const token = req.cookies.get('user_token')?.value;
  
  if (!token) {
    return {
      tier: UserTier.GUEST,
      isRestricted: false,
      isBlacklisted: false
    };
  }

  try {
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return {
        tier: UserTier.GUEST,
        isRestricted: false,
        isBlacklisted: false
      };
    }

    const user = session.user;
    const now = new Date();
    
    return {
      userId: user.id,
      tier: user.tier as UserTier,
      isRestricted: user.restrictedUntil ? user.restrictedUntil > now : false,
      isBlacklisted: !!user.blacklistedAt,
      restrictedUntil: user.restrictedUntil || undefined
    };
  } catch (error) {
    console.error('[getUserContext] Error:', error);
    return {
      tier: UserTier.GUEST,
      isRestricted: false,
      isBlacklisted: false
    };
  }
}

async function recordViolation(
  ipAddress: string,
  userId: string | undefined,
  endpoint: string,
  violationType: string,
  severity: ViolationSeverity,
  requestCount: number,
  limit: number
): Promise<void> {
  try {
    await prisma.rateViolation.create({
      data: {
        userId,
        ipAddress,
        endpoint,
        violationType,
        severity,
        requestCount,
        limit,
        details: {
          timestamp: new Date().toISOString(),
          userAgent: 'unknown'
        }
      }
    });

    if (userId && severity !== ViolationSeverity.WARNING) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user) {
        const newWarningCount = user.warningCount + 1;
        const updateData: any = {
          warningCount: newWarningCount,
          lastWarningAt: new Date()
        };

        if (newWarningCount >= 3 && newWarningCount < 5) {
          updateData.restrictedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        } else if (newWarningCount >= 5) {
          updateData.blacklistedAt = new Date();
          updateData.blacklistReason = 'Repeated rate limit violations';
          updateData.isActive = false;
        }

        await prisma.user.update({
          where: { id: userId },
          data: updateData
        });
      }
    }
  } catch (error) {
    console.error('[recordViolation] Error:', error);
  }
}

function cleanupExpiredRecords(): void {
  const now = Date.now();
  const entries = Array.from(memoryStore.entries());
  for (const [key, record] of entries) {
    if (record.resetTime <= now) {
      memoryStore.delete(key);
    }
  }
}

export function createRateLimiter(config: RateLimitConfig) {
  setInterval(cleanupExpiredRecords, 60000);

  return async function rateLimit(req: NextRequest): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
    userContext?: UserContext;
  }> {
    const identifier = config.identifier ? config.identifier(req) : getClientIP(req);
    const userContext = await getUserContext(req);
    
    if (userContext.isBlacklisted) {
      console.log(`[RateLimit] Blocked blacklisted user: ${userContext.userId || identifier}`);
      await recordViolation(
        identifier,
        userContext.userId,
        req.nextUrl.pathname,
        'blacklisted_access',
        ViolationSeverity.BLACKLIST,
        0,
        0
      );
      return { allowed: false, reason: '您的帳號已被停用', userContext };
    }

    if (userContext.isRestricted) {
      const minutesLeft = userContext.restrictedUntil
        ? Math.ceil((userContext.restrictedUntil.getTime() - Date.now()) / 60000)
        : 0;
      console.log(`[RateLimit] User restricted: ${userContext.userId || identifier}`);
      return {
        allowed: false,
        reason: `您的帳號已被暫時限制，請在 ${minutesLeft} 分鐘後再試`,
        retryAfter: minutesLeft * 60,
        userContext
      };
    }
    
    if (isIPBlacklisted(identifier)) {
      console.log(`[RateLimit] Blocked blacklisted IP: ${identifier}`);
      return { allowed: false, reason: 'Access denied', userContext };
    }

    if (isIPWhitelisted(identifier)) {
      return { allowed: true, userContext };
    }

    const userAgent = req.headers.get('user-agent');
    if (process.env.ENABLE_USER_AGENT_CHECK === 'true' && isSuspiciousUserAgent(userAgent)) {
      console.log(`[RateLimit] Blocked suspicious User-Agent: ${userAgent} from ${identifier}`);
      return { allowed: false, reason: 'Invalid client', userContext };
    }

    let maxRequests = config.maxRequests;
    if (config.tierLimits) {
      maxRequests = config.tierLimits[userContext.tier] || config.maxRequests;
    }

    const now = Date.now();
    let record = memoryStore.get(identifier);

    if (!record || record.resetTime <= now) {
      record = {
        requests: 1,
        resetTime: now + config.windowMs,
        cooldownMultiplier: 1,
        warningCount: 0
      };
      memoryStore.set(identifier, record);
      return { allowed: true, userContext };
    }

    record.requests++;

    if (record.requests > maxRequests) {
      const cooldownMultiplier = record.cooldownMultiplier || 1;
      
      if (record.requests === maxRequests + 1) {
        record.cooldownMultiplier = Math.min((cooldownMultiplier * 2), 64);
        record.resetTime = now + (config.windowMs * record.cooldownMultiplier);
        record.warningCount = (record.warningCount || 0) + 1;

        let severity = ViolationSeverity.WARNING;
        if (record.warningCount >= 5) {
          severity = ViolationSeverity.BLACKLIST;
        } else if (record.warningCount >= 3) {
          severity = ViolationSeverity.RESTRICTION;
        }

        await recordViolation(
          identifier,
          userContext.userId,
          req.nextUrl.pathname,
          'rate_limit_exceeded',
          severity,
          record.requests,
          maxRequests
        );
      }

      console.log(`[RateLimit] Rate limit exceeded for ${identifier}: ${record.requests}/${maxRequests}, cooldown: ${cooldownMultiplier}x, warnings: ${record.warningCount}`);
      
      return {
        allowed: false,
        reason: `請求次數過多，請稍後再試 (${userContext.tier === UserTier.GUEST ? '訪客' : userContext.tier === UserTier.MEMBER ? '會員' : '付費會員'} 限制: ${maxRequests}/分鐘)`,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
        userContext
      };
    }

    return { allowed: true, userContext };
  };
}

export const uploadRateLimiter = createRateLimiter({
  maxRequests: parseInt(process.env.UPLOAD_RATE_LIMIT_PER_MINUTE || '10'),
  windowMs: 60 * 1000,
  tierLimits: {
    guest: 10,
    member: 30,
    premium: 100
  }
});

export const apiRateLimiter = createRateLimiter({
  maxRequests: parseInt(process.env.API_RATE_LIMIT_PER_MINUTE || '60'),
  windowMs: 60 * 1000,
  tierLimits: {
    guest: 60,
    member: 120,
    premium: 300
  }
});

export const strictRateLimiter = createRateLimiter({
  maxRequests: parseInt(process.env.STRICT_RATE_LIMIT_PER_MINUTE || '3'),
  windowMs: 60 * 1000,
  tierLimits: {
    guest: 3,
    member: 10,
    premium: 30
  }
});