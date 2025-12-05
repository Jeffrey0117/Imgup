import { prisma } from '@/lib/prisma';

export interface DeviceFingerprintData {
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screenRes: string;
  plugins: string;
}

export interface VpnProxyResult {
  isVpnProxy: boolean;
  confidence: number;
  country?: string;
  city?: string;
}

export class IdentityService {
  /**
   * 识别设备并创建或更新设备指纹记录
   */
  static async identifyDevice(data: DeviceFingerprintData, userId?: string) {
    try {
      // 检查设备指纹是否已存在
      const existing = await prisma.deviceFingerprint.findUnique({
        where: { fingerprint: data.fingerprint },
      });

      if (existing) {
        // 更新现有记录
        return await prisma.deviceFingerprint.update({
          where: { fingerprint: data.fingerprint },
          data: {
            lastSeen: new Date(),
            uploadCount: { increment: 1 },
            userId: userId || existing.userId,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          },
        });
      }

      // 检测VPN/代理
      const vpnCheck = await this.detectVpnProxy(data.ipAddress);

      // 计算风险评分
      const riskScore = this.calculateRiskScore({
        isVpnProxy: vpnCheck.isVpnProxy,
        isNewDevice: true,
      });

      // 创建新记录
      return await prisma.deviceFingerprint.create({
        data: {
          userId,
          fingerprint: data.fingerprint,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          platform: data.platform,
          language: data.language,
          timezone: data.timezone,
          screenRes: data.screenRes,
          plugins: data.plugins,
          isVpnProxy: vpnCheck.isVpnProxy,
          riskScore,
        },
      });
    } catch (error) {
      console.error('Failed to identify device:', error);
      throw new Error('Device identification failed');
    }
  }

  /**
   * 关联设备到用户
   */
  static async linkDeviceToUser(fingerprint: string, userId: string) {
    try {
      return await prisma.deviceFingerprint.update({
        where: { fingerprint },
        data: { userId },
      });
    } catch (error) {
      console.error('Failed to link device to user:', error);
      throw new Error('Device linking failed');
    }
  }

  /**
   * 获取设备历史记录
   */
  static async getDeviceHistory(fingerprint: string) {
    try {
      const device = await prisma.deviceFingerprint.findUnique({
        where: { fingerprint },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          uploadRecords: {
            take: 10,
            orderBy: { uploadedAt: 'desc' },
          },
        },
      });

      if (!device) {
        throw new Error('Device not found');
      }

      return device;
    } catch (error) {
      console.error('Failed to get device history:', error);
      throw new Error('Failed to retrieve device history');
    }
  }

  /**
   * VPN/代理检测（使用ip-api.com）
   */
  static async detectVpnProxy(ipAddress: string): Promise<VpnProxyResult> {
    try {
      // 跳过本地IP
      if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.')) {
        return { isVpnProxy: false, confidence: 1.0 };
      }

      const response = await fetch(
        `http://ip-api.com/json/${ipAddress}?fields=status,message,proxy,hosting,country,city`
      );

      if (!response.ok) {
        console.warn('IP API request failed:', response.statusText);
        return { isVpnProxy: false, confidence: 0.5 };
      }

      const data = await response.json();

      if (data.status === 'fail') {
        console.warn('IP API returned error:', data.message);
        return { isVpnProxy: false, confidence: 0.5 };
      }

      // 检测代理或托管服务商
      const isVpnProxy = data.proxy === true || data.hosting === true;

      return {
        isVpnProxy,
        confidence: 0.85,
        country: data.country,
        city: data.city,
      };
    } catch (error) {
      console.error('VPN/Proxy detection failed:', error);
      // 网络错误时返回保守结果
      return { isVpnProxy: false, confidence: 0.3 };
    }
  }

  /**
   * 计算风险评分 (0-100)
   */
  static calculateRiskScore(factors: {
    isVpnProxy?: boolean;
    highFrequency?: boolean;
    multipleAccounts?: boolean;
    unusualTime?: boolean;
    violationHistory?: boolean;
    isNewDevice?: boolean;
  }): number {
    let score = 0;

    // VPN/代理使用 +30分
    if (factors.isVpnProxy) score += 30;

    // 高频上传 +20分
    if (factors.highFrequency) score += 20;

    // 多账号同IP +25分
    if (factors.multipleAccounts) score += 25;

    // 异常时间段 +15分
    if (factors.unusualTime) score += 15;

    // 历史违规记录 +10分
    if (factors.violationHistory) score += 10;

    // 新设备 +5分
    if (factors.isNewDevice) score += 5;

    return Math.min(score, 100);
  }

  /**
   * 获取用户的所有设备
   */
  static async getUserDevices(userId: string) {
    try {
      return await prisma.deviceFingerprint.findMany({
        where: { userId },
        orderBy: { lastSeen: 'desc' },
      });
    } catch (error) {
      console.error('Failed to get user devices:', error);
      throw new Error('Failed to retrieve user devices');
    }
  }

  /**
   * 获取IP地址关联的所有设备（用于检测多账号）
   */
  static async getDevicesByIp(ipAddress: string) {
    try {
      return await prisma.deviceFingerprint.findMany({
        where: { ipAddress },
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
      console.error('Failed to get devices by IP:', error);
      throw new Error('Failed to retrieve devices by IP');
    }
  }
}
