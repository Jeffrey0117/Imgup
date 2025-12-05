'use client';

import { useEffect, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: {
    uploadPerDay: number;
    maxFileSize: string;
    maxStorageSize: string;
    imageRetentionDays: number;
  };
  isPopular?: boolean;
}

export default function PricingTable() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch('/api/membership/plans');
        const data = await res.json();

        if (data.success) {
          setPlans(data.data);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const handleSubscribe = async (planId: string) => {
    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          provider: 'stripe',
        }),
      });

      const data = await res.json();

      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        alert('支付创建失败: ' + (data.error || '未知错误'));
      }
    } catch (err) {
      alert('网络错误，请稍后重试');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* 计费周期切换 */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 inline-flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            按月付费
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            按年付费
            <span className="ml-2 text-xs text-green-600 font-semibold">省17%</span>
          </button>
        </div>
      </div>

      {/* 价格卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map(plan => {
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly / 12;
          const isFree = plan.priceMonthly === 0;

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:scale-105 ${
                plan.isPopular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {/* 推荐标签 */}
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-xs font-bold rounded-bl-lg">
                  推荐
                </div>
              )}

              <div className="p-6">
                {/* 计划名称 */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-600 mb-6">{plan.description}</p>

                {/* 价格 */}
                <div className="mb-6">
                  {isFree ? (
                    <div className="text-4xl font-bold text-gray-900">免费</div>
                  ) : (
                    <>
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">
                          ¥{price.toFixed(2)}
                        </span>
                        <span className="ml-2 text-gray-600">/月</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className="text-sm text-gray-500 mt-1">
                          年付 ¥{plan.priceYearly}/年
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* 订阅按钮 */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isFree}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    plan.isPopular
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : isFree
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-900'
                  }`}
                >
                  {isFree ? '当前计划' : '立即订阅'}
                </button>

                {/* 功能列表 */}
                <div className="mt-8 space-y-3">
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>每日上传 {plan.limits.uploadPerDay} 张</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>最大 {plan.limits.maxFileSize}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>存储 {plan.limits.maxStorageSize}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>
                      保留 {plan.limits.imageRetentionDays === 999999 ? '永久' : `${plan.limits.imageRetentionDays}天`}
                    </span>
                  </div>

                  {/* 额外功能 */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="pt-4 border-t">
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm text-gray-600 mb-2">
                          <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部说明 */}
      <div className="mt-12 text-center text-sm text-gray-600">
        <p>所有计划均支持随时取消，按年付费可享受17%折扣</p>
        <p className="mt-2">支持支付宝、微信支付、信用卡</p>
      </div>
    </div>
  );
}
