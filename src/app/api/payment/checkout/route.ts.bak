// src/app/api/payment/checkout/route.ts
// 支付结账API - 创建支付会话

import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment-service';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planId, billingCycle, provider } = body;

    if (!planId || !billingCycle || !provider) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const baseUrl = req.headers.get('origin') || 'http://localhost:3000';

    const checkout = await PaymentService.createCheckout(provider, {
      userId: session.user.id,
      planId,
      billingCycle,
      successUrl: `${baseUrl}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/membership/pricing`,
    });

    return NextResponse.json({
      success: true,
      data: checkout,
    });
  } catch (error) {
    console.error('Failed to create checkout:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
