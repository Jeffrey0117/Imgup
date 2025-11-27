// src/app/api/quota/route.ts
// 配额状态API - 获取用户配额和使用情况

import { NextRequest, NextResponse } from 'next/server';
import { QuotaService } from '@/services/quota-service';
import { getServerSession } from 'next-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quotaDetail = await QuotaService.getQuotaDetail(session.user.id);

    return NextResponse.json({
      success: true,
      data: quotaDetail,
    });
  } catch (error) {
    console.error('Failed to get quota:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve quota information' },
      { status: 500 }
    );
  }
}
