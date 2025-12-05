// src/middleware/upload-tracking.ts
// 上传追踪中间件 - 自动记录上传到相册和存储统计

import { NextRequest, NextResponse } from 'next/server';
import { AlbumService } from '@/services/album-service';
import { StorageService } from '@/services/storage-service';
import { TrackingService } from '@/services/tracking-service';
import { IdentityService } from '@/services/identity-service';

export interface UploadTrackingContext {
  userId: string;
  mappingId: string;
  fileSize: number;
  fileName: string;
  fileType: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
}

/**
 * 上传后处理 - 记录到相册、存储统计、追踪日志
 */
export async function trackUpload(context: UploadTrackingContext): Promise<void> {
  try {
    // 并行执行多个追踪任务
    await Promise.all([
      // 1. 添加到默认相册
      AlbumService.addToDefaultAlbum(context.userId, context.mappingId),

      // 2. 更新存储统计
      StorageService.recordUpload({
        userId: context.userId,
        imageSize: context.fileSize,
      }),

      // 3. 记录上传行为
      TrackingService.recordUpload({
        userId: context.userId,
        imageId: context.mappingId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        fileSize: context.fileSize,
        fileType: context.fileType,
        fileName: context.fileName,
        uploadMethod: 'web',
      }),

      // 4. 记录用户活动
      TrackingService.recordActivity({
        userId: context.userId,
        action: 'upload_image',
        resource: context.mappingId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          fileName: context.fileName,
          fileSize: context.fileSize,
          fileType: context.fileType,
        },
      }),
    ]);

    console.log(`Upload tracked successfully: ${context.mappingId}`);
  } catch (error) {
    // 记录错误但不阻断上传流程
    console.error('Upload tracking failed:', error);
  }
}

/**
 * 上传前检查 - 验证配额和设备
 */
export async function preUploadCheck(
  userId: string,
  fileSize: number,
  deviceFingerprintData?: any
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // 1. 检查存储配额
    const canUpload = await StorageService.canUpload(userId, fileSize);
    if (!canUpload) {
      return {
        allowed: false,
        reason: 'Storage quota exceeded. Please upgrade your plan or delete some files.',
      };
    }

    // 2. 如果有设备指纹，识别设备
    if (deviceFingerprintData) {
      const device = await IdentityService.identifyDevice(deviceFingerprintData, userId);

      // 检查风险评分
      if (device.riskScore >= 70) {
        return {
          allowed: false,
          reason: 'High risk device detected. Please contact support.',
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Pre-upload check failed:', error);
    // 出错时默认允许上传，避免误伤
    return { allowed: true };
  }
}

/**
 * 删除追踪 - 更新存储统计和相册
 */
export async function trackDeletion(userId: string, mappingId: string, fileSize: number): Promise<void> {
  try {
    await Promise.all([
      // 1. 更新存储统计
      StorageService.recordDeletion(userId, fileSize),

      // 2. 记录删除活动
      TrackingService.recordActivity({
        userId,
        action: 'delete_image',
        resource: mappingId,
        ipAddress: 'system',
        userAgent: 'system',
      }),
    ]);

    console.log(`Deletion tracked successfully: ${mappingId}`);
  } catch (error) {
    console.error('Deletion tracking failed:', error);
  }
}

/**
 * Next.js API路由辅助函数 - 从请求中提取上下文
 */
export function extractUploadContext(
  req: NextRequest,
  userId: string,
  mappingId: string,
  file: { size: number; name: string; type: string }
): UploadTrackingContext {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  return {
    userId,
    mappingId,
    fileSize: file.size,
    fileName: file.name,
    fileType: file.type,
    ipAddress,
    userAgent,
  };
}

/**
 * 批量上传追踪
 */
export async function trackBatchUpload(contexts: UploadTrackingContext[]): Promise<void> {
  try {
    // 并行处理所有上传
    await Promise.all(contexts.map((ctx) => trackUpload(ctx)));

    console.log(`Batch upload tracked: ${contexts.length} files`);
  } catch (error) {
    console.error('Batch upload tracking failed:', error);
  }
}

/**
 * 获取上传统计摘要
 */
export async function getUploadSummary(userId: string) {
  try {
    const [storageDetail, recentActivity, albums] = await Promise.all([
      StorageService.getStorageDetail(userId),
      TrackingService.getRecentActivitySummary(userId, 24),
      AlbumService.getUserAlbums(userId),
    ]);

    return {
      storage: storageDetail,
      recentActivity,
      albums: {
        total: albums.length,
        defaultAlbum: albums.find((a) => a.isDefault),
        customAlbums: albums.filter((a) => !a.isDefault),
      },
    };
  } catch (error) {
    console.error('Failed to get upload summary:', error);
    throw new Error('Failed to retrieve upload summary');
  }
}
