import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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
 * 生成 JWT Token
 */
export function generateTokens(
  payload: Omit<AdminTokenPayload, "sessionId"> & { sessionId: string }
) {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "admin-cms",
    audience: "admin",
  });

  const refreshToken = jwt.sign(
    { adminId: payload.adminId, sessionId: payload.sessionId },
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: "admin-cms",
      audience: "admin",
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

    // 建立新的 session
    const sessionData = {
      adminId: admin.id,
      userAgent: userAgent || null,
      ipAddress: ipAddress || "127.0.0.1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天
    };

    const session = await prisma.adminSession.create({
      data: {
        ...sessionData,
        token: "temp", // 暫時值，稍後更新
        refreshToken: "temp", // 暫時值，稍後更新
      },
    });

    // 生成 tokens
    const tokens = generateTokens({
      adminId: admin.id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      sessionId: session.id,
    });

    // 更新 session 的 tokens
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
        token: token,
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
