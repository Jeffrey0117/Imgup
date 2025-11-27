// src/middleware/upload-validator.ts
// 上传验证中间件 - 配额检查、速率限制、风险评估

import { NextRequest, NextResponse } from 'next/server';
import { QuotaService } from '@/services/quota-service';
import { RateLimitService } from '@/services/rate-limit-service';
import { riskAssessmentService, RiskFactors } from '@/services/risk-assessment-service';
import { IdentityService } from '@/services/identity-service';

export interface UploadValidationContext {
  userId: string;
  fileSize: number;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  riskScore?: number;
  rateLimit?: {
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
  };
}

/**
 * 完整的上传验证流程
 */
export async function validateUpload(context: UploadValidationContext): Promise<ValidationResult> {
  try {
    // 1. 速率限制检查（最快，先检查）
    const rateLimit = await RateLimitService.checkUploadRateLimit(context.userId);
    if (!rateLimit.allowed) {
      await RateLimitService.recordViolation(
        context.userId,
        'upload',
        'rate_limit_exceeded',
        { retryAfter: rateLimit.retryAfter }
      );

      return {
        allowed: false,
        reason: `Rate limit exceeded. Please try again in ${rateLimit.retryAfter} seconds.`,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
          retryAfter: rateLimit.retryAfter,
        },
      };
    }

    // 2. IP速率限制检查
    const ipRateLimit = await RateLimitService.checkIpRateLimit(context.ipAddress);
    if (!ipRateLimit.allowed) {
      return {
        allowed: false,
        reason: 'Too many requests from this IP address. Please try again later.',
        rateLimit: {
          remaining: ipRateLimit.remaining,
          resetAt: ipRateLimit.resetAt,
          retryAfter: ipRateLimit.retryAfter,
        },
      };
    }

    // 3. 配额检查
    const quotaCheck = await QuotaService.canUpload(context.userId, context.fileSize);
    if (!quotaCheck.allowed) {
      return {
        allowed: false,
        reason: quotaCheck.reason || 'Quota exceeded',
      };
    }

    // 4. 风险评估
    const riskFactors: RiskFactors = {};

    // 检查设备指纹和VPN
    if (context.deviceFingerprint) {
      try {
        const device = await IdentityService.identifyDevice(
          {
            fingerprint: context.deviceFingerprint,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            platform: '',
            language: '',
            timezone: '',
            screenRes: '',
            plugins: '',
          },
          context.userId
        );

        if (device.isVpnProxy) {
          riskFactors.usesVpnOrProxy = true;
        }
      } catch (error) {
        console.error('Device identification failed:', error);
      }
    }

    // 检查上传频率
    const recentUploads = await QuotaService.getUserQuota(context.userId);
    if (recentUploads.uploadCountThisHour >= recentUploads.maxUploadPerHour * 0.8) {
      riskFactors.highFrequencyUpload = true;
    }

    // 检查多账号同IP
    const devicesOnIp = await IdentityService.getDevicesByIp(context.ipAddress);
    if (devicesOnIp.length >= 3) {
      riskFactors.multiAccountSameIp = true;
    }

    // 检查异常时间窗口（凌晨2-6点）
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 6) {
      riskFactors.abnormalTimeWindow = true;
    }

    // 检查历史违规
    const violations = await RateLimitService.getViolationHistory(context.userId, 10);
    if (violations.length >= 3) {
      riskFactors.historicalViolations = true;
    }

    // 评估风险
    const riskAssessment = riskAssessmentService.assessUploadRisk(riskFactors);

    // 高风险直接拒绝
    if (riskAssessment.score >= 70) {
      return {
        allowed: false,
        reason: 'High risk upload detected. Please contact support.',
        riskScore: riskAssessment.score,
      };
    }

    // 中风险记录但允许
    if (riskAssessment.score >= 40) {
      console.warn(`Medium risk upload detected for user ${context.userId}:`, riskAssessment.report);
    }

    // 全部通过
    return {
      allowed: true,
      riskScore: riskAssessment.score,
      rateLimit: {
        remaining: rateLimit.remaining - 1,
        resetAt: rateLimit.resetAt,
      },
    };
  } catch (error) {
    console.error('Upload validation failed:', error);
    // 验证失败时默认拒绝，保护系统安全
    return {
      allowed: false,
      reason: 'Validation error. Please try again.',
    };
  }
}

/**
 * Next.js API路由中间件
 */
export async function uploadValidatorMiddleware(
  req: NextRequest,
  userId: string,
  fileSize: number
): Promise<NextResponse | null> {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const deviceFingerprint = req.headers.get('x-device-fingerprint') || undefined;

  const validation = await validateUpload({
    userId,
    fileSize,
    ipAddress,
    userAgent,
    deviceFingerprint,
  });

  if (!validation.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: validation.reason,
        riskScore: validation.riskScore,
        rateLimit: validation.rateLimit,
      },
      { status: 429 }
    );
  }

  // 验证通过，返回null表示继续处理
  return null;
}

/**
 * 批量上传验证
 */
export async function validateBatchUpload(
  contexts: UploadValidationContext[]
): Promise<ValidationResult[]> {
  const results = await Promise.all(contexts.map((ctx) => validateUpload(ctx)));
  return results;
}

/**
 * 简化版验证（仅配额和速率限制）
 */
export async function quickValidate(userId: string, fileSize: number): Promise<ValidationResult> {
  try {
    // 1. 速率限制
    const rateLimit = await RateLimitService.checkUploadRateLimit(userId);
    if (!rateLimit.allowed) {
      return {
        allowed: false,
        reason: `Rate limit exceeded. Try again in ${rateLimit.retryAfter}s.`,
      };
    }

    // 2. 配额
    const quotaCheck = await QuotaService.canUpload(userId, fileSize);
    if (!quotaCheck.allowed) {
      return {
        allowed: false,
        reason: quotaCheck.reason,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Quick validation failed:', error);
    return { allowed: false, reason: 'Validation error' };
  }
}

/**
 * 管理员绕过验证
 */
export async function validateUploadAdmin(userId: string): Promise<ValidationResult> {
  // 管理员始终允许，但仍记录风险评分
  return { allowed: true, riskScore: 0 };
}

/**
 * 获取用户上传状态摘要
 */
export async function getUploadStatus(userId: string) {
  try {
    const [quota, quotaDetail] = await Promise.all([
      QuotaService.getUserQuota(userId),
      QuotaService.getQuotaDetail(userId),
    ]);

    return {
      quota: quotaDetail,
      canUpload: quota.uploadCountToday < quota.maxUploadPerDay,
      nextResetAt: {
        daily: getNextMidnight(),
        hourly: getNextHour(),
        minute: getNextMinute(),
      },
    };
  } catch (error) {
    console.error('Failed to get upload status:', error);
    throw new Error('Failed to retrieve upload status');
  }
}

/**
 * 辅助函数：获取下一个午夜时间
 */
function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * 辅助函数：获取下一个整点
 */
function getNextHour(): Date {
  const next = new Date();
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

/**
 * 辅助函数：获取下一分钟
 */
function getNextMinute(): Date {
  const next = new Date();
  next.setMinutes(next.getMinutes() + 1, 0, 0);
  return next;
}
