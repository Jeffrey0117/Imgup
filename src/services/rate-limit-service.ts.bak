// src/services/rate-limit-service.ts
// 速率限制服务 - 使用Redis实现滑动窗口、令牌桶算法

import { prisma } from '@/lib/prisma';

/**
 * Redis客户端（如果有的话，否则使用数据库fallback）
 */
let redis: any = null;

// 尝试导入ioredis，如果没有安装则使用数据库fallback
try {
  const Redis = require('ioredis');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redis = new Redis(redisUrl);
  console.log('Redis connected for rate limiting');
} catch (error) {
  console.warn('Redis not available, using database fallback for rate limiting');
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

export class RateLimitService {
  /**
   * 滑动窗口速率限制（Redis实现）
   */
  static async checkRateLimitRedis(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    if (!redis) {
      return this.checkRateLimitDB(key, limit, windowSeconds);
    }

    try {
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;

      // Redis事务
      const pipeline = redis.pipeline();

      // 移除窗口外的旧记录
      pipeline.zremrangebyscore(key, 0, windowStart);

      // 计算当前窗口内的请求数
      pipeline.zcard(key);

      // 添加当前请求
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // 设置过期时间
      pipeline.expire(key, windowSeconds);

      const results = await pipeline.exec();

      // 获取当前请求数（在添加之前）
      const currentCount = results[1][1] as number;

      const allowed = currentCount < limit;
      const remaining = Math.max(0, limit - currentCount - 1);

      // 如果超限，移除刚才添加的请求
      if (!allowed) {
        await redis.zrem(key, `${now}-${Math.random()}`);
      }

      const resetAt = new Date(now + windowSeconds * 1000);
      const retryAfter = allowed ? undefined : windowSeconds;

      return {
        allowed,
        remaining,
        resetAt,
        retryAfter,
      };
    } catch (error) {
      console.error('Redis rate limit check failed:', error);
      // Fallback到数据库
      return this.checkRateLimitDB(key, limit, windowSeconds);
    }
  }

  /**
   * 滑动窗口速率限制（数据库fallback）
   */
  static async checkRateLimitDB(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowSeconds * 1000);

      // 查询窗口内的违规记录数
      const count = await prisma.rateViolation.count({
        where: {
          userId: key,
          createdAt: { gte: windowStart },
        },
      });

      const allowed = count < limit;
      const remaining = Math.max(0, limit - count);

      if (!allowed) {
        // 记录违规
        await prisma.rateViolation.create({
          data: {
            userId: key,
            endpoint: 'upload',
            violationType: 'rate_limit_exceeded',
          },
        });
      }

      const resetAt = new Date(now.getTime() + windowSeconds * 1000);
      const retryAfter = allowed ? undefined : windowSeconds;

      return {
        allowed,
        remaining,
        resetAt,
        retryAfter,
      };
    } catch (error) {
      console.error('Database rate limit check failed:', error);
      // 出错时默认允许，避免误伤
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    }
  }

  /**
   * 令牌桶算法（Redis实现）
   */
  static async checkTokenBucket(
    key: string,
    capacity: number,
    refillRate: number,
    refillInterval: number
  ): Promise<RateLimitResult> {
    if (!redis) {
      return this.checkRateLimitDB(key, capacity, refillInterval);
    }

    try {
      const bucketKey = `token_bucket:${key}`;
      const now = Date.now();

      // 获取当前令牌数和最后更新时间
      const [tokens, lastRefill] = await redis.hmget(bucketKey, 'tokens', 'lastRefill');

      let currentTokens = tokens ? parseFloat(tokens) : capacity;
      let lastRefillTime = lastRefill ? parseInt(lastRefill) : now;

      // 计算需要补充的令牌
      const timePassed = now - lastRefillTime;
      const intervalsElapsed = Math.floor(timePassed / refillInterval);
      const tokensToAdd = intervalsElapsed * refillRate;

      currentTokens = Math.min(capacity, currentTokens + tokensToAdd);
      lastRefillTime = lastRefillTime + intervalsElapsed * refillInterval;

      const allowed = currentTokens >= 1;

      if (allowed) {
        currentTokens -= 1;
      }

      // 更新Redis
      await redis.hmset(bucketKey, 'tokens', currentTokens.toString(), 'lastRefill', lastRefillTime.toString());
      await redis.expire(bucketKey, Math.ceil(capacity / refillRate) * refillInterval);

      const resetAt = new Date(lastRefillTime + refillInterval);
      const retryAfter = allowed ? undefined : Math.ceil((1 - currentTokens) * (refillInterval / refillRate));

      return {
        allowed,
        remaining: Math.floor(currentTokens),
        resetAt,
        retryAfter,
      };
    } catch (error) {
      console.error('Token bucket check failed:', error);
      return this.checkRateLimitDB(key, capacity, refillInterval);
    }
  }

  /**
   * 检查上传速率限制
   */
  static async checkUploadRateLimit(userId: string): Promise<RateLimitResult> {
    // 使用滑动窗口：每分钟最多5次上传
    return this.checkRateLimitRedis(`upload:${userId}`, 5, 60);
  }

  /**
   * 检查API速率限制
   */
  static async checkApiRateLimit(userId: string, endpoint: string): Promise<RateLimitResult> {
    // 每秒最多10个API请求
    return this.checkRateLimitRedis(`api:${userId}:${endpoint}`, 10, 1);
  }

  /**
   * 检查IP速率限制
   */
  static async checkIpRateLimit(ipAddress: string): Promise<RateLimitResult> {
    // 每分钟最多100个请求（防DDoS）
    return this.checkRateLimitRedis(`ip:${ipAddress}`, 100, 60);
  }

  /**
   * 记录速率违规
   */
  static async recordViolation(
    userId: string,
    endpoint: string,
    violationType: string,
    metadata?: any
  ): Promise<void> {
    try {
      await prisma.rateViolation.create({
        data: {
          userId,
          endpoint,
          violationType,
          metadata,
        },
      });

      // 检查是否需要封禁用户
      const recentViolations = await prisma.rateViolation.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // 1小时内
        },
      });

      if (recentViolations >= 10) {
        console.warn(`User ${userId} exceeded violation threshold: ${recentViolations} violations in 1 hour`);
        // 可以在这里触发封禁逻辑
      }
    } catch (error) {
      console.error('Failed to record violation:', error);
    }
  }

  /**
   * 获取用户违规历史
   */
  static async getViolationHistory(userId: string, limit: number = 50) {
    try {
      return await prisma.rateViolation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Failed to get violation history:', error);
      throw new Error('Failed to retrieve violation history');
    }
  }

  /**
   * 清理旧的违规记录
   */
  static async cleanupOldViolations(daysOld: number = 30): Promise<void> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysOld);

      const result = await prisma.rateViolation.deleteMany({
        where: {
          createdAt: { lt: cutoff },
        },
      });

      console.log(`Cleaned up ${result.count} old violation records`);
    } catch (error) {
      console.error('Failed to cleanup violations:', error);
    }
  }

  /**
   * 获取Redis连接状态
   */
  static isRedisAvailable(): boolean {
    return redis !== null;
  }
}
