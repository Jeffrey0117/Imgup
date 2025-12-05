// src/services/invoice-service.ts
// 账单管理服务 - 发票生成、支付记录、退款

import { prisma } from '@/lib/prisma';
import { Invoice, Prisma } from '@prisma/client';

export interface CreateInvoiceParams {
  userId: string;
  membershipId: string;
  amount: number;
  currency: string;
  description: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod?: string;
}

export interface PayInvoiceParams {
  invoiceId: string;
  paymentId: string;
  paidAmount: number;
  paymentMethod: string;
  metadata?: any;
}

export interface RefundInvoiceParams {
  invoiceId: string;
  refundAmount: number;
  refundReason: string;
}

export class InvoiceService {
  /**
   * 创建新账单
   */
  static async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    try {
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 7); // 7天支付期限

      return await prisma.invoice.create({
        data: {
          userId: params.userId,
          membershipId: params.membershipId,
          invoiceNumber: this.generateInvoiceNumber(),
          amount: params.amount,
          currency: params.currency || 'CNY',
          description: params.description,
          status: 'pending',
          dueDate,
          billingCycle: params.billingCycle,
          paymentMethod: params.paymentMethod,
        },
      });
    } catch (error) {
      console.error('Failed to create invoice:', error);
      throw new Error('Invoice creation failed');
    }
  }

  /**
   * 标记账单为已支付
   */
  static async markAsPaid(params: PayInvoiceParams): Promise<Invoice> {
    try {
      return await prisma.invoice.update({
        where: { id: params.invoiceId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paidAmount: params.paidAmount,
          paymentId: params.paymentId,
          paymentMethod: params.paymentMethod,
          metadata: params.metadata,
        },
      });
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
      throw new Error('Invoice payment recording failed');
    }
  }

  /**
   * 标记账单为失败
   */
  static async markAsFailed(invoiceId: string, failureReason?: string): Promise<Invoice> {
    try {
      return await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'failed',
          metadata: { failureReason },
        },
      });
    } catch (error) {
      console.error('Failed to mark invoice as failed:', error);
      throw new Error('Invoice failure recording failed');
    }
  }

  /**
   * 退款
   */
  static async refundInvoice(params: RefundInvoiceParams): Promise<Invoice> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: params.invoiceId },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status !== 'paid') {
        throw new Error('Only paid invoices can be refunded');
      }

      return await prisma.invoice.update({
        where: { id: params.invoiceId },
        data: {
          status: 'refunded',
          refundedAt: new Date(),
          refundAmount: params.refundAmount,
          metadata: {
            ...((invoice.metadata as any) || {}),
            refundReason: params.refundReason,
          },
        },
      });
    } catch (error) {
      console.error('Failed to refund invoice:', error);
      throw new Error('Invoice refund failed');
    }
  }

  /**
   * 取消账单
   */
  static async cancelInvoice(invoiceId: string): Promise<Invoice> {
    try {
      return await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'cancelled' },
      });
    } catch (error) {
      console.error('Failed to cancel invoice:', error);
      throw new Error('Invoice cancellation failed');
    }
  }

  /**
   * 获取用户所有账单
   */
  static async getUserInvoices(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const where: Prisma.InvoiceWhereInput = { userId };

      if (options?.status) {
        where.status = options.status;
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: options?.limit || 50,
          skip: options?.offset || 0,
          include: {
            membership: {
              include: { plan: true },
            },
          },
        }),
        prisma.invoice.count({ where }),
      ]);

      return { invoices, total };
    } catch (error) {
      console.error('Failed to get user invoices:', error);
      throw new Error('Failed to retrieve user invoices');
    }
  }

  /**
   * 获取账单详情
   */
  static async getInvoiceById(invoiceId: string) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          membership: {
            include: { plan: true },
          },
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    } catch (error) {
      console.error('Failed to get invoice:', error);
      throw new Error('Failed to retrieve invoice details');
    }
  }

  /**
   * 检查并更新过期账单
   */
  static async checkOverdueInvoices(): Promise<void> {
    try {
      const now = new Date();

      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: 'pending',
          dueDate: { lt: now },
        },
      });

      for (const invoice of overdueInvoices) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'overdue' },
        });

        console.log(`Invoice ${invoice.invoiceNumber} marked as overdue`);
      }

      console.log(`Checked ${overdueInvoices.length} overdue invoices`);
    } catch (error) {
      console.error('Failed to check overdue invoices:', error);
    }
  }

  /**
   * 生成账单号
   */
  private static generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `INV${year}${month}${day}${random}`;
  }

  /**
   * 获取账单统计
   */
  static async getInvoiceStats(userId: string) {
    try {
      const [total, paid, pending, overdue, refunded] = await Promise.all([
        prisma.invoice.count({ where: { userId } }),
        prisma.invoice.count({ where: { userId, status: 'paid' } }),
        prisma.invoice.count({ where: { userId, status: 'pending' } }),
        prisma.invoice.count({ where: { userId, status: 'overdue' } }),
        prisma.invoice.count({ where: { userId, status: 'refunded' } }),
      ]);

      // 计算总支付金额
      const totalPaid = await prisma.invoice.aggregate({
        where: { userId, status: 'paid' },
        _sum: { paidAmount: true },
      });

      // 计算总退款金额
      const totalRefunded = await prisma.invoice.aggregate({
        where: { userId, status: 'refunded' },
        _sum: { refundAmount: true },
      });

      return {
        counts: {
          total,
          paid,
          pending,
          overdue,
          refunded,
        },
        amounts: {
          totalPaid: totalPaid._sum.paidAmount || 0,
          totalRefunded: totalRefunded._sum.refundAmount || 0,
          netAmount: (totalPaid._sum.paidAmount || 0) - (totalRefunded._sum.refundAmount || 0),
        },
      };
    } catch (error) {
      console.error('Failed to get invoice stats:', error);
      throw new Error('Failed to retrieve invoice statistics');
    }
  }

  /**
   * 获取最近的账单
   */
  static async getRecentInvoices(userId: string, limit: number = 5) {
    try {
      return await prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          membership: {
            include: { plan: true },
          },
        },
      });
    } catch (error) {
      console.error('Failed to get recent invoices:', error);
      throw new Error('Failed to retrieve recent invoices');
    }
  }

  /**
   * 获取待支付账单
   */
  static async getPendingInvoices(userId: string) {
    try {
      return await prisma.invoice.findMany({
        where: {
          userId,
          status: { in: ['pending', 'overdue'] },
        },
        orderBy: { dueDate: 'asc' },
        include: {
          membership: {
            include: { plan: true },
          },
        },
      });
    } catch (error) {
      console.error('Failed to get pending invoices:', error);
      throw new Error('Failed to retrieve pending invoices');
    }
  }

  /**
   * 计算用户总消费
   */
  static async getUserTotalSpending(userId: string) {
    try {
      const result = await prisma.invoice.aggregate({
        where: {
          userId,
          status: 'paid',
        },
        _sum: {
          paidAmount: true,
        },
        _count: true,
      });

      return {
        totalAmount: result._sum.paidAmount || 0,
        invoiceCount: result._count,
      };
    } catch (error) {
      console.error('Failed to calculate total spending:', error);
      throw new Error('Failed to calculate total spending');
    }
  }

  /**
   * 生成月度账单报告
   */
  static async generateMonthlyReport(userId: string, year: number, month: number) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const invoices = await prisma.invoice.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          membership: {
            include: { plan: true },
          },
        },
      });

      const summary = {
        period: `${year}-${String(month).padStart(2, '0')}`,
        invoiceCount: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
        paidAmount: invoices
          .filter((inv) => inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
        pendingAmount: invoices
          .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
          .reduce((sum, inv) => sum + inv.amount, 0),
        invoices,
      };

      return summary;
    } catch (error) {
      console.error('Failed to generate monthly report:', error);
      throw new Error('Failed to generate monthly report');
    }
  }
}
