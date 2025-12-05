import PricingTable from '@/components/PricingTable';

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl mb-4">
            选择适合您的会员计划
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            从免费试用到企业定制，我们提供灵活的计划满足不同需求
          </p>
        </div>

        {/* 价格表 */}
        <PricingTable />

        {/* 常见问题 */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">常见问题</h2>

          <div className="space-y-6">
            <details className="bg-white rounded-lg shadow p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900">
                可以随时取消订阅吗？
              </summary>
              <p className="mt-3 text-gray-600">
                是的，您可以随时取消订阅。取消后，您的会员权益将持续到当前计费周期结束。
              </p>
            </details>

            <details className="bg-white rounded-lg shadow p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900">
                支持哪些支付方式？
              </summary>
              <p className="mt-3 text-gray-600">
                我们支持支付宝、微信支付和信用卡支付，所有支付均通过安全加密通道处理。
              </p>
            </details>

            <details className="bg-white rounded-lg shadow p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900">
                升级后会立即生效吗？
              </summary>
              <p className="mt-3 text-gray-600">
                是的，升级后您的新配额将立即生效。如果从月付切换到年付，我们会按比例退还剩余天数的费用。
              </p>
            </details>

            <details className="bg-white rounded-lg shadow p-6 cursor-pointer">
              <summary className="font-semibold text-gray-900">
                如何申请企业定制方案？
              </summary>
              <p className="mt-3 text-gray-600">
                请发送邮件至 enterprise@example.com 或拨打 400-XXX-XXXX 联系我们的商务团队，我们将为您提供专属定制方案。
              </p>
            </details>
          </div>
        </div>

        {/* 联系支持 */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            还有疑问？{' '}
            <a href="/support" className="text-blue-500 hover:text-blue-600 font-semibold">
              联系客服支持
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
