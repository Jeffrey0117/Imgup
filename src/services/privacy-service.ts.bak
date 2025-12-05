// src/services/privacy-service.ts
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export type ExportedUserData = Prisma.UserGetPayload<{
  include: {
    Mapping: { include: { AccessLog: true; ReferrerStats: true; uploadRecords: true; albumItems: true } };
    uploadRecords: true;
    activityLogs: true;
    loginHistory: true;
    membership: { include: { plan: true; invoices: true } };
    invoices: true;
    sessions: true;
    albums: { include: { items: true } };
    deviceFingerprints: true;
    quota: true;
    storageStats: true;
  };
}>;

export interface ConsentStatus {
  gdprConsent: boolean;
  gdprConsentAt: Date | null;
  marketingConsent: boolean;
  dataRetentionConsent: boolean;
}

export interface ConsentUpdateInput {
  gdprConsent?: boolean;
  marketingConsent?: boolean;
  dataRetentionConsent?: boolean;
}

const ANON_VALUE = "anonymized";

/**
 * 导出用户完整数据（GDPR 数据可携权）
 */
export async function exportUserData(userId: string): Promise<ExportedUserData> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        Mapping: {
          include: {
            AccessLog: true,
            ReferrerStats: true,
            uploadRecords: true,
            albumItems: true,
          },
        },
        uploadRecords: true,
        activityLogs: true,
        loginHistory: true,
        membership: { include: { plan: true, invoices: true } },
        invoices: true,
        sessions: true,
        albums: { include: { items: true } },
        deviceFingerprints: true,
        quota: true,
        storageStats: true,
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    return user;
  });
}

/**
 * 级联删除用户及所有关联数据（GDPR 删除权）
 */
export async function deleteUserData(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const mappingIds = await getMappingIds(tx, userId);

    if (mappingIds.length) {
      await tx.accessLog.deleteMany({ where: { mappingId: { in: mappingIds } } });
      await tx.referrerStats.deleteMany({ where: { mappingId: { in: mappingIds } } });
      await tx.albumItem.deleteMany({ where: { mappingId: { in: mappingIds } } });
    }

    await tx.album.deleteMany({ where: { userId } });
    await tx.userSession.deleteMany({ where: { userId } });
    await tx.deviceFingerprint.deleteMany({ where: { userId } });
    await tx.uploadRecord.deleteMany({ where: { userId } });
    await tx.userActivityLog.deleteMany({ where: { userId } });
    await tx.loginHistory.deleteMany({ where: { userId } });
    await tx.invoice.deleteMany({ where: { userId } });
    await tx.userMembership.deleteMany({ where: { userId } });
    await tx.userQuota.deleteMany({ where: { userId } });
    await tx.userStorageStats.deleteMany({ where: { userId } });
    await tx.rateViolation.deleteMany({ where: { userId } });
    await tx.mapping.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
}

/**
 * 数据匿名化（最小化可识别信息）
 */
export async function anonymizeUserData(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const anonEmail = `anon+${userId}@example.invalid`;
    const anonUsername = `anon_${userId.slice(0, 8)}`;

    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonEmail,
        username: anonUsername,
        phone: null,
        idType: null,
        idNumber: null,
        idVerified: false,
        verificationLevel: 0,
        country: null,
        city: null,
        timezone: null,
        language: null,
        twoFactorSecret: null,
        lastLoginIp: null,
        blacklistedAt: null,
        blacklistReason: null,
        marketingConsent: false,
        dataRetentionConsent: false,
        gdprConsentAt: null,
      },
    });

    await tx.loginHistory.updateMany({
      where: { userId },
      data: {
        ipAddress: ANON_VALUE,
        userAgent: ANON_VALUE,
        geoCountry: null,
        geoCity: null,
        deviceFingerprint: null,
      },
    });

    await tx.userActivityLog.updateMany({
      where: { userId },
      data: { ipAddress: ANON_VALUE, userAgent: ANON_VALUE, metadata: null },
    });

    await tx.uploadRecord.updateMany({
      where: { userId },
      data: {
        ipAddress: ANON_VALUE,
        userAgent: ANON_VALUE,
        geoCountry: null,
        geoCity: null,
        blockReason: null,
      },
    });

    await tx.deviceFingerprint.updateMany({
      where: { userId },
      data: {
        ipAddress: ANON_VALUE,
        userAgent: ANON_VALUE,
        platform: ANON_VALUE,
        language: null,
        timezone: null,
        screenRes: null,
        plugins: ANON_VALUE,
      },
    });

    await tx.mapping.updateMany({
      where: { userId },
      data: { ipAddress: null, password: null, deletedBy: null },
    });

    await tx.userSession.deleteMany({ where: { userId } });
  });
}

/**
 * 检查用户同意状态
 */
export async function checkConsent(userId: string): Promise<ConsentStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      gdprConsentAt: true,
      marketingConsent: true,
      dataRetentionConsent: true,
    },
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  return {
    gdprConsent: Boolean(user.gdprConsentAt),
    gdprConsentAt: user.gdprConsentAt,
    marketingConsent: user.marketingConsent,
    dataRetentionConsent: user.dataRetentionConsent,
  };
}

/**
 * 更新同意记录（自动打上 GDPR 时间戳）
 */
export async function updateConsent(userId: string, input: ConsentUpdateInput): Promise<ConsentStatus> {
  const data: Prisma.UserUpdateInput = {};

  if (input.gdprConsent !== undefined) {
    data.gdprConsentAt = input.gdprConsent ? new Date() : null;
  }
  if (input.marketingConsent !== undefined) {
    data.marketingConsent = input.marketingConsent;
  }
  if (input.dataRetentionConsent !== undefined) {
    data.dataRetentionConsent = input.dataRetentionConsent;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("No consent fields provided to update.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      gdprConsentAt: true,
      marketingConsent: true,
      dataRetentionConsent: true,
    },
  });

  return {
    gdprConsent: Boolean(updated.gdprConsentAt),
    gdprConsentAt: updated.gdprConsentAt,
    marketingConsent: updated.marketingConsent,
    dataRetentionConsent: updated.dataRetentionConsent,
  };
}

async function getMappingIds(tx: Tx, userId: string): Promise<string[]> {
  const mappings = await tx.mapping.findMany({
    where: { userId },
    select: { id: true },
  });
  return mappings.map((m) => m.id);
}
