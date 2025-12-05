import { prisma } from '@/lib/prisma';

export interface RecordUploadParams {
  userId?: string;
  imageId: string;
  deviceFingerprintId?: string;
  ipAddress: string;
  userAgent: string;
  fileSize: number;
  fileType: string;
  fileName: string;
  uploadMethod?: string;
  geoCountry?: string;
  geoCity?: string;
}

export interface RecordActivityParams {
  userId?: string;
  action: string;
  resource?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: any;
}

export interface RecordLoginParams {
  userId: string;
  ipAddress: string;
  userAgent: string;
  loginMethod?: string;
  isSuccessful?: boolean;
  failureReason?: string;
  geoCountry?: string;
  geoCity?: string;
  deviceFingerprint?: string;
}

export class TrackingService {
  /**
   * 记录上传行为
   */
  static async recordUpload(params: RecordUploadParams) {
    try {
      return await prisma.uploadRecord.create({
        data: {
          userId: params.userId,
          mappingId: params.imageId,
          deviceFingerprintId: params.deviceFingerprintId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          fileSize: params.fileSize,
          fileType: params.fileType,
          fileName: params.fileName,
          uploadMethod: params.uploadMethod || 'web',
          geoCountry: params.geoCountry,
          geoCity: params.geoCity,
        },
      });
    } catch (error) {
      console.error('Failed to record upload:', error);
      throw new Error('Upload recording failed');
    }
  }

  /**
   * 记录用户活动
   */
  static async recordActivity(params: RecordActivityParams) {
    try {
      return await prisma.userActivityLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata,
        },
      });
    } catch (error) {
      console.error('Failed to record activity:', error);
      throw new Error('Activity recording failed');
    }
  }

  /**
   * 记录登录历史
   */
  static async recordLogin(params: RecordLoginParams) {
    try {
      return await prisma.loginHistory.create({
        data: {
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          loginMethod: params.loginMethod || 'password',
          isSuccessful: params.isSuccessful !== false,
          failureReason: params.failureReason,
          geoCountry: params.geoCountry,
          geoCity: params.geoCity,
          deviceFingerprint: params.deviceFingerprint,
        },
      });
    } catch (error) {
      console.error('Failed to record login:', error);
      throw new Error('Login recording failed');
    }
  }

  /**
   * 查询活动日志
   */
  static async getActivityLog(params: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = {};
      if (params.userId) where.userId = params.userId;
      if (params.action) where.action = params.action;
      if (params.startDate || params.endDate) {
        where.createdAt = {};
        if (params.startDate) where.createdAt.gte = params.startDate;
        if (params.endDate) where.createdAt.lte = params.endDate;
      }

      return await prisma.userActivityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      });
    } catch (error) {
      console.error('Failed to get activity log:', error);
      throw new Error('Failed to retrieve activity log');
    }
  }

  /**
   * 查询上传历史
   */
  static async getUploadHistory(params: {
    userId?: string;
    deviceFingerprintId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = {};
      if (params.userId) where.userId = params.userId;
      if (params.deviceFingerprintId) where.deviceFingerprintId = params.deviceFingerprintId;
      if (params.startDate || params.endDate) {
        where.uploadedAt = {};
        if (params.startDate) where.uploadedAt.gte = params.startDate;
        if (params.endDate) where.uploadedAt.lte = params.endDate;
      }

      return await prisma.uploadRecord.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Failed to get upload history:', error);
      throw new Error('Failed to retrieve upload history');
    }
  }

  /**
   * 获取用户最近的活动摘要
   */
  static async getRecentActivitySummary(userId: string, hours: number = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const [uploads, logins, activities] = await Promise.all([
        prisma.uploadRecord.count({
          where: { userId, uploadedAt: { gte: since } },
        }),
        prisma.loginHistory.count({
          where: { userId, createdAt: { gte: since } },
        }),
        prisma.userActivityLog.count({
          where: { userId, createdAt: { gte: since } },
        }),
      ]);

      return {
        uploads,
        logins,
        totalActivities: activities,
        period: `${hours}h`,
        since,
      };
    } catch (error) {
      console.error('Failed to get activity summary:', error);
      throw new Error('Failed to retrieve activity summary');
    }
  }
}
