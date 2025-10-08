import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_USER_SECRET || 'user-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_USER_REFRESH_SECRET || 'user-refresh-secret-key-change-in-production';

interface TokenPayload {
  userId: string;
  email: string;
  tier: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function createUserSession(
  userId: string,
  ipAddress: string,
  userAgent: string | null
): Promise<{ token: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, tier: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const payload: TokenPayload = {
    userId,
    email: user.email,
    tier: user.tier
  };

  const token = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      userId,
      token,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt
    }
  });

  return { token, refreshToken };
}

export async function cleanupOldSessions(userId: string): Promise<void> {
  const sessions = await prisma.userSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  if (sessions.length > 5) {
    const toDelete = sessions.slice(5);
    await prisma.userSession.deleteMany({
      where: {
        id: { in: toDelete.map(s => s.id) }
      }
    });
  }
}

export async function validateEmail(email: string): Promise<{ valid: boolean; error?: string }> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: '電子郵件格式不正確' };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return { valid: false, error: '此電子郵件已被註冊' };
  }

  return { valid: true };
}

export async function validateUsername(username: string): Promise<{ valid: boolean; error?: string }> {
  if (username.length < 3 || username.length > 20) {
    return { valid: false, error: '使用者名稱長度必須在 3-20 個字元之間' };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, error: '使用者名稱只能包含英文字母、數字和底線' };
  }

  const existingUser = await prisma.user.findUnique({
    where: { username }
  });

  if (existingUser) {
    return { valid: false, error: '此使用者名稱已被使用' };
  }

  return { valid: true };
}

export async function validatePasswordStrength(password: string): Promise<{ valid: boolean; error?: string }> {
  if (password.length < 8) {
    return { valid: false, error: '密碼長度至少需要 8 個字元' };
  }

  if (password.length > 100) {
    return { valid: false, error: '密碼長度不能超過 100 個字元' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return { valid: false, error: '密碼必須包含大寫字母、小寫字母和數字' };
  }

  return { valid: true };
}