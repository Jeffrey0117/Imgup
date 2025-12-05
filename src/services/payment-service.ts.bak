// src/services/payment-service.ts
// 支付服务 - Stripe、支付宝、微信支付集成

import { InvoiceService } from './invoice-service';
import { MembershipService } from './membership-service';

export interface PaymentProvider {
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession>;
  processWebhook(payload: any, signature: string): Promise<WebhookEvent>;
  refund(paymentId: string, amount: number): Promise<RefundResult>;
}

export interface CreateCheckoutParams {
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  expiresAt: Date;
}

export interface WebhookEvent {
  type: string;
  data: any;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
}

/**
 * Stripe 支付提供商
 */
export class StripePaymentProvider implements PaymentProvider {
  private stripe: any;

  constructor() {
    // 初始化Stripe（需要安装 stripe npm包）
    try {
      const Stripe = require('stripe');
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      console.log('Stripe initialized');
    } catch (error) {
      console.warn('Stripe not available:', error);
    }
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      // 获取计划信息
      const plan = await MembershipService.getPlanById(params.planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const amount = params.billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;

      // 创建Stripe Checkout会话
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'cny',
              product_data: {
                name: plan.name,
                description: plan.description || undefined,
              },
              unit_amount: Math.round(amount * 100), // 转换为分
              recurring: {
                interval: params.billingCycle === 'monthly' ? 'month' : 'year',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        client_reference_id: params.userId,
        metadata: {
          userId: params.userId,
          planId: params.planId,
          billingCycle: params.billingCycle,
        },
      });

      return {
        sessionId: session.id,
        url: session.url!,
        expiresAt: new Date(session.expires_at * 1000),
      };
    } catch (error) {
      console.error('Failed to create Stripe checkout session:', error);
      throw new Error('Checkout session creation failed');
    }
  }

  async processWebhook(payload: any, signature: string): Promise<WebhookEvent> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // 处理不同的事件类型
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object);
          break;
      }

      return {
        type: event.type,
        data: event.data.object,
      };
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw new Error('Webhook verification failed');
    }
  }

  async refund(paymentId: string, amount: number): Promise<RefundResult> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentId,
        amount: Math.round(amount * 100),
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
      };
    } catch (error) {
      console.error('Refund failed:', error);
      throw new Error('Refund processing failed');
    }
  }

  private async handleCheckoutCompleted(session: any) {
    const userId = session.metadata.userId;
    const planId = session.metadata.planId;
    const billingCycle = session.metadata.billingCycle;

    // 创建会员
    const membership = await MembershipService.createMembership({
      userId,
      planId,
      billingCycle,
      paymentMethod: 'stripe',
      autoRenew: true,
    });

    // 创建账单
    await InvoiceService.createInvoice({
      userId,
      membershipId: membership.id,
      amount: session.amount_total / 100,
      currency: session.currency,
      description: `${planId} - ${billingCycle}`,
      billingCycle,
      paymentMethod: 'stripe',
    });

    console.log(`Checkout completed for user ${userId}`);
  }

  private async handleInvoicePaid(invoice: any) {
    // 标记账单为已支付
    // 实际应该通过发票号查找
    console.log(`Invoice paid: ${invoice.id}`);
  }

  private async handlePaymentFailed(invoice: any) {
    console.error(`Payment failed for invoice: ${invoice.id}`);
  }

  private async handleSubscriptionCancelled(subscription: any) {
    console.log(`Subscription cancelled: ${subscription.id}`);
  }
}

/**
 * 支付宝支付提供商（基础框架）
 */
export class AlipayPaymentProvider implements PaymentProvider {
  constructor() {
    console.log('Alipay provider initialized (stub)');
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
    // TODO: 实现支付宝支付
    throw new Error('Alipay integration not implemented yet');
  }

  async processWebhook(payload: any, signature: string): Promise<WebhookEvent> {
    // TODO: 实现支付宝回调处理
    throw new Error('Alipay webhook not implemented yet');
  }

  async refund(paymentId: string, amount: number): Promise<RefundResult> {
    // TODO: 实现支付宝退款
    throw new Error('Alipay refund not implemented yet');
  }
}

/**
 * 微信支付提供商（基础框架）
 */
export class WechatPaymentProvider implements PaymentProvider {
  constructor() {
    console.log('WeChat Pay provider initialized (stub)');
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
    // TODO: 实现微信支付
    throw new Error('WeChat Pay integration not implemented yet');
  }

  async processWebhook(payload: any, signature: string): Promise<WebhookEvent> {
    // TODO: 实现微信回调处理
    throw new Error('WeChat Pay webhook not implemented yet');
  }

  async refund(paymentId: string, amount: number): Promise<RefundResult> {
    // TODO: 实现微信退款
    throw new Error('WeChat Pay refund not implemented yet');
  }
}

/**
 * 支付服务统一接口
 */
export class PaymentService {
  private static providers: Map<string, PaymentProvider> = new Map([
    ['stripe', new StripePaymentProvider()],
    ['alipay', new AlipayPaymentProvider()],
    ['wechat', new WechatPaymentProvider()],
  ]);

  /**
   * 获取支付提供商
   */
  static getProvider(provider: string): PaymentProvider {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`Payment provider ${provider} not found`);
    }
    return providerInstance;
  }

  /**
   * 创建支付会话
   */
  static async createCheckout(
    provider: string,
    params: CreateCheckoutParams
  ): Promise<CheckoutSession> {
    const paymentProvider = this.getProvider(provider);
    return paymentProvider.createCheckoutSession(params);
  }

  /**
   * 处理Webhook
   */
  static async processWebhook(
    provider: string,
    payload: any,
    signature: string
  ): Promise<WebhookEvent> {
    const paymentProvider = this.getProvider(provider);
    return paymentProvider.processWebhook(payload, signature);
  }

  /**
   * 退款
   */
  static async refund(provider: string, paymentId: string, amount: number): Promise<RefundResult> {
    const paymentProvider = this.getProvider(provider);
    return paymentProvider.refund(paymentId, amount);
  }

  /**
   * 获取可用支付方式
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
