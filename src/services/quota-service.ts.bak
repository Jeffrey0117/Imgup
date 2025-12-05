// src/services/quota-service.ts
// 配额管理服务 - 上传次数、存储空间、文件大小限制

import { prisma } from '@/lib/prisma';
import { UserQuota } from '@prisma/client';

export interface QuotaLimits {
  uploadPerDay: number;
  uploadPerHour: number;
  uploadPerMinute: number;
  maxFileSize: number;
  maxStorageSize: bigint;
  imageRetentionDays: number;
}

export interface QuotaUsage {
  uploadedToday: number;
  uploadedThisHour: number;
  uploadedThisMinute: number;
  storageUsed: bigint;
  remainingUploads: number;
  remainingStorage: bigint;
  canUpload: boolean;
}

export class QuotaService {
  /**
   * 获取会员计划的配额限制
   */
  static getPlanLimits(planId: string): QuotaLimits {
    const limits: Record<string, QuotaLimits> = {
      free_trial: {
        uploadPerDay: 10,
        uploadPerHour: 5,
        uploadPerMinute: 2,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxStorageSize: BigInt(100 * 1024 * 1024), // 100MB
        imageRetentionDays: 7,
      },
      basic: {
        uploadPerDay: 50,
        uploadPerHour: 20,
        uploadPerMinute: 5,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxStorageSize: BigInt(1 * 1024 * 1024 * 1024), // 1GB
        imageRetentionDays: 30,
      },
      pro: {
        uploadPerDay: 200,
        uploadPerHour: 50,
        uploadPerMinute: 10,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxStorageSize: BigInt(10 * 1024 * 1024 * 1024), // 10GB
        imageRetentionDays: 365,
      },
      enterprise: {
        uploadPerDay: 1000,
        uploadPerHour: 200,
        uploadPerMinute: 30,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxStorageSize: BigInt(100 * 1024 * 1024 * 1024), // 100GB
        imageRetentionDays: 999999, // 无限期
      },
    };

    return limits[planId] || limits.free_trial;
  }

  /**
   * 初始化用户配额
   */
  static async initializeQuota(userId: string, planId: string = 'free_trial'): Promise<UserQuota> {
    try {
      const limits = this.getPlanLimits(planId);

      return await prisma.userQuota.upsert({
        where: { userId },
        update: {
          maxUploadPerDay: limits.uploadPerDay,
          maxUploadPerHour: limits.uploadPerHour,
          maxUploadPerMinute: limits.uploadPerMinute,
          maxFileSize: limits.maxFileSize,
          maxStorageSize: limits.maxStorageSize,
          imageRetentionDays: limits.imageRetentionDays,
        },
        create: {
          userId,
          uploadCountToday: 0,
          uploadCountThisHour: 0,
          uploadCountThisMinute: 0,
          maxUploadPerDay: limits.uploadPerDay,
          maxUploadPerHour: limits.uploadPerHour,
          maxUploadPerMinute: limits.uploadPerMinute,
          maxFileSize: limits.maxFileSize,
          maxStorageSize: limits.maxStorageSize,
          storageUsed: BigInt(0),
          imageRetentionDays: limits.imageRetentionDays,
        },
      });
    } catch (error) {
      console.error('Failed to initialize quota:', error);
      throw new Error('Quota initialization failed');
    }
  }

  /**
   * 获取用户配额
   */
  static async getUserQuota(userId: string): Promise<UserQuota> {
    try {
      let quota = await prisma.userQuota.findUnique({
        where: { userId },
      });

      if (!quota) {
        quota = await this.initializeQuota(userId);
      }

      return quota;
    } catch (error) {
      console.error('Failed to get user quota:', error);
      throw new Error('Failed to retrieve user quota');
    }
  }

  /**
   * 检查配额使用情况
   */
  static async checkQuotaUsage(userId: string): Promise<QuotaUsage> {
    try {
      const quota = await this.getUserQuota(userId);

      const remainingUploads = Math.max(0, quota.maxUploadPerDay - quota.uploadCountToday);
      const remainingStorage = quota.maxStorageSize - quota.storageUsed;
      const canUpload = remainingUploads > 0 && remainingStorage > BigInt(0);

      return {
        uploadedToday: quota.uploadCountToday,
        uploadedThisHour: quota.uploadCountThisHour,
        uploadedThisMinute: quota.uploadCountThisMinute,
        storageUsed: quota.storageUsed,
        remainingUploads,
        remainingStorage,
        canUpload,
      };
    } catch (error) {
      console.error('Failed to check quota usage:', error);
      throw new Error('Quota usage check failed');
    }
  }

  /**
   * 检查是否可以上传
   */
  static async canUpload(userId: string, fileSize: number): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const quota = await this.getUserQuota(userId);

      // 检查每日上传次数
      if (quota.uploadCountToday >= quota.maxUploadPerDay) {
        return {
          allowed: false,
          reason: `Daily upload limit reached (${quota.maxUploadPerDay} files/day)`,
        };
      }

      // 检查每小时上传次数
      if (quota.uploadCountThisHour >= quota.maxUploadPerHour) {
        return {
          allowed: false,
          reason: `Hourly upload limit reached (${quota.maxUploadPerHour} files/hour)`,
        };
      }

      // 检查每分钟上传次数
      if (quota.uploadCountThisMinute >= quota.maxUploadPerMinute) {
        return {
          allowed: false,
          reason: `Rate limit exceeded (${quota.maxUploadPerMinute} files/minute)`,
        };
      }

      // 检查文件大小
      if (fileSize > quota.maxFileSize) {
        return {
          allowed: false,
          reason: `File size exceeds limit (max ${this.formatSize(quota.maxFileSize)})`,
        };
      }

      // 检查存储空间
      const remainingStorage = quota.maxStorageSize - quota.storageUsed;
      if (BigInt(fileSize) > remainingStorage) {
        return {
          allowed: false,
          reason: `Storage quota exceeded (${this.formatSize(remainingStorage)} remaining)`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Failed to check upload permission:', error);
      return { allowed: false, reason: 'Quota check failed' };
    }
  }

  /**
   * 增加上传计数
   */
  static async incrementUploadCount(userId: string): Promise<void> {
    try {
      await prisma.userQuota.update({
        where: { userId },
        data: {
          uploadCountToday: { increment: 1 },
          uploadCountThisHour: { increment: 1 },
          uploadCountThisMinute: { increment: 1 },
          lastUploadAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to increment upload count:', error);
      throw new Error('Upload count increment failed');
    }
  }

  /**
   * 重置每日计数器
   */
  static async resetDailyCounters(): Promise<void> {
    try {
      await prisma.userQuota.updateMany({
        data: {
          uploadCountToday: 0,
        },
      });
      console.log('Daily counters reset successfully');
    } catch (error) {
      console.error('Failed to reset daily counters:', error);
    }
  }

  /**
   * 重置每小时计数器
   */
  static async resetHourlyCounters(): Promise<void> {
    try {
      await prisma.userQuota.updateMany({
        data: {
          uploadCountThisHour: 0,
        },
      });
      console.log('Hourly counters reset successfully');
    } catch (error) {
      console.error('Failed to reset hourly counters:', error);
    }
  }

  /**
   * 重置每分钟计数器
   */
  static async resetMinuteCounters(): Promise<void> {
    try {
      await prisma.userQuota.updateMany({
        data: {
          uploadCountThisMinute: 0,
        },
      });
      console.log('Minute counters reset successfully');
    } catch (error) {
      console.error('Failed to reset minute counters:', error);
    }
  }

  /**
   * 更新存储使用量
   */
  static async updateStorageUsed(userId: string, delta: number): Promise<void> {
    try {
      await prisma.userQuota.update({
        where: { userId },
        data: {
          storageUsed: {
            increment: BigInt(delta),
          },
        },
      });
    } catch (error) {
      console.error('Failed to update storage used:', error);
      throw new Error('Storage update failed');
    }
  }

  /**
   * 升级用户计划配额
   */
  static async upgradePlan(userId: string, newPlanId: string): Promise<UserQuota> {
    try {
      const limits = this.getPlanLimits(newPlanId);

      return await prisma.userQuota.update({
        where: { userId },
        data: {
          maxUploadPerDay: limits.uploadPerDay,
          maxUploadPerHour: limits.uploadPerHour,
          maxUploadPerMinute: limits.uploadPerMinute,
          maxFileSize: limits.maxFileSize,
          maxStorageSize: limits.maxStorageSize,
          imageRetentionDays: limits.imageRetentionDays,
        },
      });
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
      throw new Error('Plan upgrade failed');
    }
  }

  /**
   * 格式化文件大小
   */
  static formatSize(bytes: bigint | number): string {
    const size = typeof bytes === 'bigint' ? Number(bytes) : bytes;

    if (size === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(1024));
    const value = size / Math.pow(1024, i);

    return `${value.toFixed(2)} ${units[i]}`;
  }

  /**
   * 获取配额详情（包含格式化）
   */
  static async getQuotaDetail(userId: string) {
    try {
      const quota = await this.getUserQuota(userId);
      const usage = await this.checkQuotaUsage(userId);

      return {
        limits: {
          uploadPerDay: quota.maxUploadPerDay,
          uploadPerHour: quota.maxUploadPerHour,
          uploadPerMinute: quota.maxUploadPerMinute,
          maxFileSize: this.formatSize(quota.maxFileSize),
          maxStorageSize: this.formatSize(quota.maxStorageSize),
          imageRetentionDays: quota.imageRetentionDays,
        },
        usage: {
          uploadedToday: usage.uploadedToday,
          uploadedThisHour: usage.uploadedThisHour,
          uploadedThisMinute: usage.uploadedThisMinute,
          storageUsed: this.formatSize(usage.storageUsed),
          remainingUploads: usage.remainingUploads,
          remainingStorage: this.formatSize(usage.remainingStorage),
          canUpload: usage.canUpload,
        },
        percentages: {
          dailyUploads: Math.round((usage.uploadedToday / quota.maxUploadPerDay) * 100),
          storage: Math.round(Number((usage.storageUsed * BigInt(10000)) / quota.maxStorageSize) / 100),
        },
      };
    } catch (error) {
      console.error('Failed to get quota detail:', error);
      throw new Error('Failed to retrieve quota detail');
    }
  }
}
