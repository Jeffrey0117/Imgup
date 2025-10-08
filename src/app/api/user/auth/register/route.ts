import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  hashPassword, 
  createUserSession, 
  cleanupOldSessions,
  validateEmail,
  validateUsername,
  validatePasswordStrength
} from '@/utils/user-auth';
import { getClientIP, strictRateLimiter } from '@/utils/rate-limit';

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
    const { email, username, password } = body;

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: '請填寫所有必填欄位' },
        { status: 400 }
      );
    }

    const emailValidation = await validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    const usernameValidation = await validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 }
      );
    }

    const passwordValidation = await validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        tier: 'member',
        isActive: true
      }
    });

    const userAgent = req.headers.get('user-agent');
    const { token, refreshToken } = await createUserSession(
      user.id,
      clientIP,
      userAgent
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        tier: user.tier
      }
    }, { status: 201 });

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
    console.error('[User Register] Error:', error);
    return NextResponse.json(
      { error: '註冊失敗，請稍後再試' },
      { status: 500 }
    );
  }
}