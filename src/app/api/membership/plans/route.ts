// src/app/api/membership/plans/route.ts
// 会员计划API - 获取所有可用计划

import { NextRequest, NextResponse } from 'next/server';
import { MembershipService } from '@/services/membership-service';

export async function GET(req: NextRequest) {
  try {
    const plansComparison = await MembershipService.getPlansComparison();

    return NextResponse.json({
      success: true,
      data: plansComparison,
    });
  } catch (error) {
    console.error('Failed to get membership plans:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve membership plans' },
      { status: 500 }
    );
  }
}
