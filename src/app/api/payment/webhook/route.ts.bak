// src/app/api/payment/webhook/route.ts
// 支付Webhook API - 处理支付回调

import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment-service';

export async function POST(req: NextRequest) {
  try {
    const provider = req.nextUrl.searchParams.get('provider') || 'stripe';
    const signature = req.headers.get('stripe-signature') || '';
    const payload = await req.text();

    await PaymentService.processWebhook(provider, payload, signature);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}
