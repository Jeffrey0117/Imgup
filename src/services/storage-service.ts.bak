// src/services/storage-service.ts
// 存储统计服务 - 追踪用户存储使用情况

import { prisma } from '@/lib/prisma';
import { UserStorageStats } from '@prisma/client';

export interface StorageUpdate {
  userId: string;
  imageSize: number;
  videoSize?: number;
  documentSize?: number;
}

export interface StorageQuota {
  used: bigint;
  limit: bigint;
  remaining: bigint;
  percentage: number;
  canUpload: boolean;
}

export class StorageService {
  /**
   * 初始化用户存储统计记录
   */
  static async initializeStorage(userId: string): Promise<UserStorageStats> {
    try {
      // 检查是否已存在
      const existing = await prisma.userStorageStats.findUnique({
        where: { userId },
      });

      if (existing) {
        return existing;
      }

      // 创建新记录
      return await prisma.userStorageStats.create({
        data: {
          userId,
          totalImages: 0,
          totalVideos: 0,
          totalDocuments: 0,
          totalSize: BigInt(0),
          imageSize: BigInt(0),
          videoSize: BigInt(0),
          documentSize: BigInt(0),
        },
      });
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw new Error('Storage initialization failed');
    }
  }

  /**
   * 记录上传 - 增加存储使用量
   */
  static async recordUpload(params: StorageUpdate): Promise<UserStorageStats> {
    try {
      // 确保存储记录存在
      await this.initializeStorage(params.userId);

      // 更新存储统计
      return await prisma.userStorageStats.update({
        where: { userId: params.userId },
        data: {
          totalImages: { increment: 1 },
          imageSize: { increment: BigInt(params.imageSize) },
          totalSize: { increment: BigInt(params.imageSize) },
          lastUploadAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to record upload:', error);
      throw new Error('Upload recording failed');
    }
  }

  /**
   * 记录删除 - 减少存储使用量
   */
  static async recordDeletion(userId: string, fileSize: number): Promise<UserStorageStats> {
    try {
      return await prisma.userStorageStats.update({
        where: { userId },
        data: {
          totalImages: { decrement: 1 },
          imageSize: { decrement: BigInt(fileSize) },
          totalSize: { decrement: BigInt(fileSize) },
        },
      });
    } catch (error) {
      console.error('Failed to record deletion:', error);
      throw new Error('Deletion recording failed');
    }
  }

  /**
   * 获取用户存储统计
   */
  static async getStorageStats(userId: string): Promise<UserStorageStats> {
    try {
      let stats = await prisma.userStorageStats.findUnique({
        where: { userId },
      });

      if (!stats) {
        stats = await this.initializeStorage(userId);
      }

      return stats;
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw new Error('Failed to retrieve storage stats');
    }
  }

  /**
   * 检查存储配额
   */
  static async checkStorageQuota(userId: string): Promise<StorageQuota> {
    try {
      // 获取用户配额
      const quota = await prisma.userQuota.findUnique({
        where: { userId },
      });

      if (!quota) {
        throw new Error('User quota not found');
      }

      // 获取存储统计
      const stats = await this.getStorageStats(userId);

      const used = stats.totalSize;
      const limit = quota.maxStorageSize;
      const remaining = limit - used;
      const percentage = Number((used * BigInt(10000)) / limit) / 100;
      const canUpload = remaining > BigInt(0);

      return {
        used,
        limit,
        remaining,
        percentage,
        canUpload,
      };
    } catch (error) {
      console.error('Failed to check storage quota:', error);
      throw new Error('Storage quota check failed');
    }
  }

  /**
   * 检查是否可以上传（基于文件大小）
   */
  static async canUpload(userId: string, fileSize: number): Promise<boolean> {
    try {
      const quota = await this.checkStorageQuota(userId);
      return quota.remaining >= BigInt(fileSize);
    } catch (error) {
      console.error('Failed to check upload permission:', error);
      return false;
    }
  }

  /**
   * 重新计算用户存储统计（用于修复不一致）
   */
  static async recalculateStorage(userId: string): Promise<UserStorageStats> {
    try {
      // 统计实际文件大小
      const result = await prisma.mapping.aggregate({
        where: { userId, deletedAt: null },
        _sum: { fileSize: true },
        _count: true,
      });

      const totalSize = BigInt(result._sum.fileSize || 0);
      const totalImages = result._count;

      // 更新存储统计
      return await prisma.userStorageStats.upsert({
        where: { userId },
        update: {
          totalImages,
          totalSize,
          imageSize: totalSize,
        },
        create: {
          userId,
          totalImages,
          totalSize,
          imageSize: totalSize,
          totalVideos: 0,
          totalDocuments: 0,
          videoSize: BigInt(0),
          documentSize: BigInt(0),
        },
      });
    } catch (error) {
      console.error('Failed to recalculate storage:', error);
      throw new Error('Storage recalculation failed');
    }
  }

  /**
   * 获取存储趋势（过去N天）
   */
  static async getStorageTrend(userId: string, days: number = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const uploads = await prisma.uploadRecord.findMany({
        where: {
          userId,
          uploadedAt: { gte: since },
        },
        select: {
          uploadedAt: true,
          fileSize: true,
        },
        orderBy: { uploadedAt: 'asc' },
      });

      // 按天分组统计
      const dailyStats: Record<string, { date: string; size: number; count: number }> = {};

      uploads.forEach((upload) => {
        const dateKey = upload.uploadedAt.toISOString().split('T')[0];
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = { date: dateKey, size: 0, count: 0 };
        }
        dailyStats[dateKey].size += upload.fileSize;
        dailyStats[dateKey].count += 1;
      });

      return Object.values(dailyStats);
    } catch (error) {
      console.error('Failed to get storage trend:', error);
      throw new Error('Failed to retrieve storage trend');
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
   * 获取用户存储详情（包含配额和统计）
   */
  static async getStorageDetail(userId: string) {
    try {
      const [stats, quota] = await Promise.all([
        this.getStorageStats(userId),
        this.checkStorageQuota(userId),
      ]);

      return {
        stats: {
          totalImages: stats.totalImages,
          totalSize: stats.totalSize,
          imageSize: stats.imageSize,
          lastUploadAt: stats.lastUploadAt,
          formattedSize: this.formatSize(stats.totalSize),
        },
        quota: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
          percentage: quota.percentage,
          canUpload: quota.canUpload,
          formattedUsed: this.formatSize(quota.used),
          formattedLimit: this.formatSize(quota.limit),
          formattedRemaining: this.formatSize(quota.remaining),
        },
      };
    } catch (error) {
      console.error('Failed to get storage detail:', error);
      throw new Error('Failed to retrieve storage detail');
    }
  }
}
