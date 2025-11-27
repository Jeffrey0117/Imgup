// src/app/api/membership/subscribe/route.ts
// 订阅API - 创建会员订阅

import { NextRequest, NextResponse } from 'next/server';
import { MembershipService } from '@/services/membership-service';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planId, billingCycle, paymentMethod } = body;

    if (!planId || !billingCycle) {
      return NextResponse.json(
        { success: false, error: 'Plan ID and billing cycle are required' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { success: false, error: 'Invalid billing cycle' },
        { status: 400 }
      );
    }

    const membership = await MembershipService.createMembership({
      userId: session.user.id,
      planId,
      billingCycle,
      paymentMethod,
      autoRenew: true,
    });

    return NextResponse.json({
      success: true,
      data: membership,
    });
  } catch (error) {
    console.error('Failed to create subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
