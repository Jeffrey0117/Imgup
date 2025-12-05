'use client';

import { useEffect, useState } from 'react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  planName: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
}

interface InvoiceListProps {
  showAll?: boolean;
  limit?: number;
  className?: string;
}

export default function InvoiceList({ showAll = false, limit = 10, className = '' }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'refunded'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();

      if (data.success) {
        setInvoices(data.data);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  }

  async function downloadInvoice(invoiceId: string, invoiceNumber: string) {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/download`);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('下载失败');
      }
    } catch (err) {
      alert('网络错误');
    }
  }

  const filteredInvoices = invoices
    .filter(invoice => {
      if (filter === 'all') return true;
      return invoice.status === filter;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    })
    .slice(0, showAll ? undefined : limit);

  const getStatusBadge = (status: Invoice['status']) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      pending: '待支付',
      paid: '已支付',
      failed: '支付失败',
      refunded: '已退款',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getBillingCycleLabel = (cycle: Invoice['billingCycle']) => {
    const labels = {
      monthly: '月付',
      yearly: '年付',
      lifetime: '终身',
    };
    return labels[cycle];
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            发票记录
          </h2>
          <span className="text-sm text-gray-600">
            共 {filteredInvoices.length} 条记录
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">状态:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="paid">已支付</option>
              <option value="pending">待支付</option>
              <option value="refunded">已退款</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">排序:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">日期</option>
              <option value="amount">金额</option>
            </select>
          </div>

          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            title={sortOrder === 'asc' ? '升序' : '降序'}
          >
            <svg className={`w-4 h-4 text-gray-600 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Invoice List */}
      <div className="divide-y">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">暂无发票记录</p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {invoice.invoiceNumber}
                    </h3>
                    {getStatusBadge(invoice.status)}
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {getBillingCycleLabel(invoice.billingCycle)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">计划: </span>
                      <span className="font-medium text-gray-900">{invoice.planName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">金额: </span>
                      <span className="font-medium text-gray-900">¥{invoice.amount.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">支付方式: </span>
                      <span className="font-medium text-gray-900">{invoice.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    创建时间: {new Date(invoice.createdAt).toLocaleString('zh-CN')}
                    {invoice.paidAt && (
                      <> | 支付时间: {new Date(invoice.paidAt).toLocaleString('zh-CN')}</>
                    )}
                    {invoice.refundedAt && (
                      <> | 退款时间: {new Date(invoice.refundedAt).toLocaleString('zh-CN')}</>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-4 flex gap-2">
                  {invoice.status === 'paid' && (
                    <button
                      onClick={() => downloadInvoice(invoice.id, invoice.invoiceNumber)}
                      className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center"
                      title="下载发票"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      下载
                    </button>
                  )}

                  {invoice.status === 'pending' && (
                    <button
                      onClick={() => window.location.href = `/payment/${invoice.id}`}
                      className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                    >
                      去支付
                    </button>
                  )}

                  <button
                    onClick={() => window.location.href = `/invoices/${invoice.id}`}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    详情
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {!showAll && filteredInvoices.length >= limit && (
        <div className="p-4 border-t text-center">
          <a
            href="/invoices"
            className="text-blue-500 hover:text-blue-600 font-semibold text-sm"
          >
            查看所有发票 →
          </a>
        </div>
      )}

      {/* Summary */}
      {filteredInvoices.length > 0 && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">总金额</p>
              <p className="text-lg font-bold text-gray-900">
                ¥{filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">已支付</p>
              <p className="text-lg font-bold text-green-600">
                {filteredInvoices.filter(inv => inv.status === 'paid').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">待支付</p>
              <p className="text-lg font-bold text-yellow-600">
                {filteredInvoices.filter(inv => inv.status === 'pending').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">已退款</p>
              <p className="text-lg font-bold text-gray-600">
                {filteredInvoices.filter(inv => inv.status === 'refunded').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
