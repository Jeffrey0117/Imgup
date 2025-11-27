// src/services/membership-service.ts
// 会员管理服务 - 订阅、升级、降级、续费

import { prisma } from '@/lib/prisma';
import { UserMembership, MembershipPlan, Prisma } from '@prisma/client';
import { QuotaService } from './quota-service';

export type MembershipWithPlan = Prisma.UserMembershipGetPayload<{
  include: { plan: true };
}>;

export interface CreateMembershipParams {
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod?: string;
  autoRenew?: boolean;
}

export interface UpgradePlanParams {
  userId: string;
  newPlanId: string;
  billingCycle: 'monthly' | 'yearly';
}

export class MembershipService {
  /**
   * 获取所有可用计划
   */
  static async getAvailablePlans(): Promise<MembershipPlan[]> {
    try {
      return await prisma.membershipPlan.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
    } catch (error) {
      console.error('Failed to get available plans:', error);
      throw new Error('Failed to retrieve membership plans');
    }
  }

  /**
   * 获取计划详情
   */
  static async getPlanById(planId: string): Promise<MembershipPlan | null> {
    try {
      return await prisma.membershipPlan.findUnique({
        where: { id: planId },
      });
    } catch (error) {
      console.error('Failed to get plan:', error);
      throw new Error('Failed to retrieve plan details');
    }
  }

  /**
   * 获取用户当前会员信息
   */
  static async getUserMembership(userId: string): Promise<MembershipWithPlan | null> {
    try {
      return await prisma.userMembership.findUnique({
        where: { userId },
        include: { plan: true },
      });
    } catch (error) {
      console.error('Failed to get user membership:', error);
      throw new Error('Failed to retrieve user membership');
    }
  }

  /**
   * 创建新会员订阅
   */
  static async createMembership(params: CreateMembershipParams): Promise<UserMembership> {
    try {
      const plan = await this.getPlanById(params.planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const now = new Date();
      const expiresAt = this.calculateExpiryDate(now, params.billingCycle);
      const nextBillingDate = params.autoRenew ? expiresAt : null;

      const membership = await prisma.$transaction(async (tx) => {
        // 创建会员记录
        const newMembership = await tx.userMembership.create({
          data: {
            userId: params.userId,
            planId: params.planId,
            status: 'active',
            billingCycle: params.billingCycle,
            startedAt: now,
            expiresAt,
            nextBillingDate,
            autoRenew: params.autoRenew ?? true,
            paymentMethod: params.paymentMethod,
          },
        });

        // 更新用户配额
        await QuotaService.upgradePlan(params.userId, params.planId);

        return newMembership;
      });

      return membership;
    } catch (error) {
      console.error('Failed to create membership:', error);
      throw new Error('Membership creation failed');
    }
  }

  /**
   * 升级/变更计划
   */
  static async upgradePlan(params: UpgradePlanParams): Promise<UserMembership> {
    try {
      const newPlan = await this.getPlanById(params.newPlanId);
      if (!newPlan) {
        throw new Error('New plan not found');
      }

      const currentMembership = await this.getUserMembership(params.userId);
      if (!currentMembership) {
        throw new Error('Current membership not found');
      }

      const now = new Date();
      const expiresAt = this.calculateExpiryDate(now, params.billingCycle);

      return await prisma.$transaction(async (tx) => {
        // 更新会员记录
        const updated = await tx.userMembership.update({
          where: { userId: params.userId },
          data: {
            planId: params.newPlanId,
            billingCycle: params.billingCycle,
            expiresAt,
            nextBillingDate: currentMembership.autoRenew ? expiresAt : null,
            status: 'active',
            updatedAt: now,
          },
        });

        // 更新配额
        await QuotaService.upgradePlan(params.userId, params.newPlanId);

        return updated;
      });
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
      throw new Error('Plan upgrade failed');
    }
  }

  /**
   * 取消订阅
   */
  static async cancelMembership(userId: string, cancelImmediately: boolean = false): Promise<UserMembership> {
    try {
      const membership = await this.getUserMembership(userId);
      if (!membership) {
        throw new Error('Membership not found');
      }

      const now = new Date();
      const data: Prisma.UserMembershipUpdateInput = {
        autoRenew: false,
        nextBillingDate: null,
        canceledAt: now,
      };

      if (cancelImmediately) {
        data.status = 'cancelled';
        data.expiresAt = now;
      } else {
        // 保持active状态直到到期
        data.status = 'cancelling';
      }

      return await prisma.userMembership.update({
        where: { userId },
        data,
      });
    } catch (error) {
      console.error('Failed to cancel membership:', error);
      throw new Error('Membership cancellation failed');
    }
  }

  /**
   * 续费会员
   */
  static async renewMembership(userId: string): Promise<UserMembership> {
    try {
      const membership = await this.getUserMembership(userId);
      if (!membership) {
        throw new Error('Membership not found');
      }

      const now = new Date();
      const newExpiryDate = this.calculateExpiryDate(
        membership.expiresAt > now ? membership.expiresAt : now,
        membership.billingCycle
      );

      return await prisma.userMembership.update({
        where: { userId },
        data: {
          status: 'active',
          expiresAt: newExpiryDate,
          nextBillingDate: membership.autoRenew ? newExpiryDate : null,
          renewedAt: now,
        },
      });
    } catch (error) {
      console.error('Failed to renew membership:', error);
      throw new Error('Membership renewal failed');
    }
  }

  /**
   * 暂停会员
   */
  static async pauseMembership(userId: string): Promise<UserMembership> {
    try {
      return await prisma.userMembership.update({
        where: { userId },
        data: {
          status: 'paused',
          autoRenew: false,
        },
      });
    } catch (error) {
      console.error('Failed to pause membership:', error);
      throw new Error('Membership pause failed');
    }
  }

  /**
   * 恢复会员
   */
  static async resumeMembership(userId: string): Promise<UserMembership> {
    try {
      const membership = await this.getUserMembership(userId);
      if (!membership) {
        throw new Error('Membership not found');
      }

      // 检查是否已过期
      const now = new Date();
      const isExpired = membership.expiresAt < now;

      return await prisma.userMembership.update({
        where: { userId },
        data: {
          status: isExpired ? 'expired' : 'active',
          autoRenew: true,
        },
      });
    } catch (error) {
      console.error('Failed to resume membership:', error);
      throw new Error('Membership resume failed');
    }
  }

  /**
   * 检查并更新过期会员
   */
  static async checkExpiredMemberships(): Promise<void> {
    try {
      const now = new Date();

      const expiredMemberships = await prisma.userMembership.findMany({
        where: {
          expiresAt: { lt: now },
          status: { in: ['active', 'cancelling'] },
        },
      });

      for (const membership of expiredMemberships) {
        if (membership.autoRenew && membership.nextBillingDate) {
          // 尝试自动续费（实际应该触发支付流程）
          console.log(`Auto-renew membership for user ${membership.userId}`);
          // await this.renewMembership(membership.userId);
        } else {
          // 标记为过期
          await prisma.userMembership.update({
            where: { id: membership.id },
            data: { status: 'expired' },
          });

          // 降级到免费计划
          await QuotaService.upgradePlan(membership.userId, 'free_trial');
        }
      }

      console.log(`Checked ${expiredMemberships.length} expired memberships`);
    } catch (error) {
      console.error('Failed to check expired memberships:', error);
    }
  }

  /**
   * 计算到期日期
   */
  private static calculateExpiryDate(startDate: Date, billingCycle: 'monthly' | 'yearly'): Date {
    const expiryDate = new Date(startDate);

    if (billingCycle === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    return expiryDate;
  }

  /**
   * 获取会员统计
   */
  static async getMembershipStats(userId: string) {
    try {
      const membership = await this.getUserMembership(userId);
      if (!membership) {
        return {
          hasMembership: false,
          isActive: false,
        };
      }

      const now = new Date();
      const daysRemaining = Math.ceil((membership.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

      return {
        hasMembership: true,
        isActive: membership.status === 'active',
        planName: membership.plan.name,
        billingCycle: membership.billingCycle,
        startedAt: membership.startedAt,
        expiresAt: membership.expiresAt,
        daysRemaining,
        isExpiringSoon,
        autoRenew: membership.autoRenew,
        status: membership.status,
      };
    } catch (error) {
      console.error('Failed to get membership stats:', error);
      throw new Error('Failed to retrieve membership stats');
    }
  }

  /**
   * 获取计划对比
   */
  static async getPlansComparison() {
    try {
      const plans = await this.getAvailablePlans();

      return plans.map((plan) => {
        const limits = QuotaService.getPlanLimits(plan.id);

        return {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          features: plan.features as string[],
          limits: {
            uploadPerDay: limits.uploadPerDay,
            maxFileSize: QuotaService.formatSize(limits.maxFileSize),
            maxStorageSize: QuotaService.formatSize(limits.maxStorageSize),
            imageRetentionDays: limits.imageRetentionDays,
          },
          isPopular: plan.isPopular,
        };
      });
    } catch (error) {
      console.error('Failed to get plans comparison:', error);
      throw new Error('Failed to retrieve plans comparison');
    }
  }
}
