import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyPassword,
  createUserSession,
  cleanupOldSessions
} from '@/utils/user-auth';
import { getClientIP, strictRateLimiter } from '@/utils/rate-limit';
import { formatApiError, logError } from '@/utils/api-errors';
import { logErrorWithContext, logSecurityEvent } from '@/utils/secure-logger';

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);
  
  try {
    const rateLimitResult = await strictRateLimiter(req);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.reason || '請求次數過多' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: '請填寫電子郵件和密碼' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: '電子郵件或密碼錯誤' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: '您的帳號已被停用，請聯絡管理員' },
        { status: 403 }
      );
    }

    if (user.blacklistedAt) {
      return NextResponse.json(
        { error: '您的帳號已被列入黑名單' },
        { status: 403 }
      );
    }

    if (user.restrictedUntil && user.restrictedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.restrictedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `您的帳號已被暫時限制，請在 ${minutesLeft} 分鐘後再試` },
        { status: 403 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: '電子郵件或密碼錯誤' },
        { status: 401 }
      );
    }


    await cleanupOldSessions(user.id);

    const userAgent = req.headers.get('user-agent');
    const { token, refreshToken } = await createUserSession(
      user.id,
      clientIP,
      userAgent
    );

    // 記錄安全事件 - 使用者成功登入
    logSecurityEvent('user_login_success', {
      userId: user.id,
      clientIP,
      userAgent
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        tier: user.tier
      }
    });

    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60
    });

    response.cookies.set('user_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;

  } catch (error) {
    // 安全記錄錯誤，避免洩漏敏感資訊
    logErrorWithContext('[User Login]', error, { clientIP });

    return NextResponse.json(
      formatApiError(error),
      { status: 500 }
    );
  }
}