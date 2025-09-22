import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// JWT 相關配置
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRES_IN = "15m"; // 15 分鐘
const REFRESH_TOKEN_EXPIRES_IN = "7d"; // 7 天

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  username: string;
  role: string;
  sessionId: string;
}

export interface LoginResult {
  success: boolean;
  data?: {
    admin: {
      id: string;
      email: string;
      username: string;
      role: string;
    };
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

/**
 * 生成安全的隨機 token (base64url 格式)
 */
export function generateSecureToken(length: number): string {
  return randomBytes(length).toString('base64url');
}

/**
 * 生成 JWT Token
 */
export function generateTokens(
  payload: Omit<AdminTokenPayload, "sessionId"> & { sessionId: string }
) {
  // 生成 JWT access token
  const accessToken = jwt.sign(
    {
      adminId: payload.adminId,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      sessionId: payload.sessionId,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "admin-cms",
      audience: "admin",
      jwtid: randomUUID(),
    }
  );

  // 生成 JWT refresh token
  const refreshToken = jwt.sign(
    {
      adminId: payload.adminId,
      sessionId: payload.sessionId,
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: "admin-cms",
      audience: "admin",
      jwtid: randomUUID(),
    }
  );

  return { accessToken, refreshToken };
}

/**
 * 驗證 Access Token
 */
export function verifyAccessToken(token: string): AdminTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: "admin-cms",
      audience: "admin",
    }) as AdminTokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * 驗證 Refresh Token
 */
export function verifyRefreshToken(
  token: string
): { adminId: string; sessionId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: "admin-cms",
      audience: "admin",
    }) as { adminId: string; sessionId: string };
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * 從請求中提取 Bearer Token
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * 獲取客戶端 IP 地址
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  return "127.0.0.1";
}

/**
 * 創建 session 並處理重試 (P2002 唯一鍵衝突)
 * 最多嘗試 5 次，自動重試生成新 token
 */
export async function createSessionWithRetry(
  adminId: string,
  userAgent: string | null,
  ipAddress: string
) {
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 清理過期的 sessions
      await prisma.adminSession.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      // 限制同一 adminId 的有效 sessions 數量為 10
      const activeSessions = await prisma.adminSession.count({
        where: { adminId },
      });

      if (activeSessions >= 10) {
        // 刪除最舊的 sessions
        const oldestSessions = await prisma.adminSession.findMany({
          where: { adminId },
          orderBy: { createdAt: 'asc' },
          take: activeSessions - 9, // 保留 9 個最新，刪除超額部分
          select: { id: true },
        });

        await prisma.adminSession.deleteMany({
          where: {
            id: { in: oldestSessions.map(s => s.id) },
          },
        });
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 天

      // 先創建 session 以獲取 ID
      const session = await prisma.adminSession.create({
        data: {
          adminId,
          userAgent,
          ipAddress,
          expiresAt,
          token: '', // 暫時空白，稍後更新
          refreshToken: '', // 暫時空白，稍後更新
        },
      });

      // 現在生成包含 sessionId 的 tokens (需要從外部提供完整資訊)
      // 注意：這裡只返回 session，實際的 token 生成在 loginAdmin 中處理
      return {
        session,
        accessToken: '', // 在 loginAdmin 中生成
        refreshToken: '', // 在 loginAdmin 中生成
      };
    } catch (error: any) {
      // 檢查是否為 P2002 唯一鍵衝突且涉及 token
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('token') &&
        attempt < maxRetries
      ) {
        // 重試生成新 token
        continue;
      }

      // 其他錯誤直接拋出
      throw error;
    }
  }

  // 如果所有重試都失敗
  throw new Error('Failed to create unique session after maximum retries');
}

/**
 * 密碼雜湊
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * 驗證密碼
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 管理員登入
 */
export async function loginAdmin(
  email: string,
  password: string,
  userAgent?: string,
  ipAddress?: string
): Promise<LoginResult> {
  try {
    // 查找管理員
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        role: true,
        isActive: true,
        failedAttempts: true,
        lockedUntil: true,
      },
    });

    if (!admin) {
      return { success: false, error: "無效的電子郵件或密碼" };
    }

    // 檢查帳號是否被鎖定
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return { success: false, error: "帳號已被鎖定，請稍後再試" };
    }

    // 檢查帳號是否啟用
    if (!admin.isActive) {
      return { success: false, error: "帳號已被停用" };
    }

    // 驗證密碼
    const isValidPassword = await verifyPassword(password, admin.passwordHash);
    if (!isValidPassword) {
      // 增加失敗次數
      const failedAttempts = admin.failedAttempts + 1;
      const shouldLock = failedAttempts >= 5;

      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          failedAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + 30 * 60 * 1000)
            : null, // 30 分鐘
        },
      });

      return { success: false, error: "無效的電子郵件或密碼" };
    }

    // 使用重試機制創建 session
    const { session, accessToken, refreshToken } = await createSessionWithRetry(
      admin.id,
      userAgent || null,
      ipAddress || "127.0.0.1"
    );
    
    // 生成包含 session ID 的正確 JWT tokens
    const tokens = generateTokens({
      adminId: admin.id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      sessionId: session.id,
    });
    
    // 更新 session 以儲存正確的 JWT tokens
    await prisma.adminSession.update({
      where: { id: session.id },
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });

    // 重置失敗次數並更新登入資訊
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress || "127.0.0.1",
      },
    });

    // 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "LOGIN",
        entity: "admin",
        entityId: admin.id,
        details: {
          userAgent: userAgent || null,
          ipAddress: ipAddress || "127.0.0.1",
        },
        ipAddress: ipAddress || "127.0.0.1",
      },
    });

    return {
      success: true,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          role: admin.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  } catch (error) {
    console.error("登入錯誤:", error);
    return { success: false, error: "系統錯誤，請稍後再試" };
  }
}

/**
 * 管理員登出
 */
export async function logoutAdmin(
  sessionId: string
): Promise<{ success: boolean }> {
  try {
    await prisma.adminSession.delete({
      where: { id: sessionId },
    });
    return { success: true };
  } catch (error) {
    console.error("登出錯誤:", error);
    return { success: false };
  }
}

/**
 * 刷新 Token
 */
export async function refreshTokens(refreshToken: string): Promise<{
  success: boolean;
  data?: { accessToken: string; refreshToken: string };
  error?: string;
}> {
  try {
    // 驗證 refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return { success: false, error: "Invalid refresh token" };
    }

    // 查找 session
    const session = await prisma.adminSession.findUnique({
      where: {
        id: payload.sessionId,
        refreshToken: refreshToken,
      },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || !session.admin.isActive) {
      return { success: false, error: "Session not found or admin inactive" };
    }

    // 檢查 session 是否過期
    if (session.expiresAt < new Date()) {
      await prisma.adminSession.delete({ where: { id: session.id } });
      return { success: false, error: "Session expired" };
    }

    // 生成新的 tokens
    const newTokens = generateTokens({
      adminId: session.admin.id,
      email: session.admin.email,
      username: session.admin.username,
      role: session.admin.role,
      sessionId: session.id,
    });

    // 更新 session
    await prisma.adminSession.update({
      where: { id: session.id },
      data: {
        token: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 延長 7 天
      },
    });

    return {
      success: true,
      data: newTokens,
    };
  } catch (error) {
    console.error("刷新 token 錯誤:", error);
    return { success: false, error: "System error" };
  }
}

/**
 * 驗證管理員 session
 */
export async function verifyAdminSession(token: string): Promise<{
  valid: boolean;
  admin?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
  sessionId?: string;
}> {
  try {
    // 驗證 token
    const payload = verifyAccessToken(token);
    if (!payload) {
      return { valid: false };
    }

    // 查找 session
    const session = await prisma.adminSession.findUnique({
      where: {
        id: payload.sessionId,
      },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || !session.admin.isActive) {
      return { valid: false };
    }

    // 檢查 session 是否過期
    if (session.expiresAt < new Date()) {
      await prisma.adminSession.delete({ where: { id: session.id } });
      return { valid: false };
    }

    return {
      valid: true,
      admin: {
        id: session.admin.id,
        email: session.admin.email,
        username: session.admin.username,
        role: session.admin.role,
      },
      sessionId: session.id,
    };
  } catch (error) {
    console.error("驗證 session 錯誤:", error);
    return { valid: false };
  }
}