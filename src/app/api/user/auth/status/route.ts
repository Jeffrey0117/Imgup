import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/utils/user-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('user_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        tier: true,
        isActive: true,
        totalUploads: true,
        warningCount: true,
        restrictedUntil: true,
        blacklistedAt: true,
      },
    });

    if (!user || !user.isActive || user.blacklistedAt) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        username: user.username,
        email: user.email,
        tier: user.tier,
        totalUploads: user.totalUploads,
        isActive: user.isActive,
        warningCount: user.warningCount,
        restrictedUntil: user.restrictedUntil?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('檢查登入狀態錯誤:', error);
    return NextResponse.json(
      { error: '檢查登入狀態失敗' },
      { status: 500 }
    );
  }
}