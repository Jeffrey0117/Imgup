import QuotaDisplay from '@/components/QuotaDisplay';
import AlbumGallery from '@/components/AlbumGallery';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">用户仪表板</h1>
          <p className="mt-2 text-gray-600">查看您的配额、相册和使用统计</p>
        </div>

        {/* 配额显示 */}
        <div className="mb-8">
          <QuotaDisplay />
        </div>

        {/* 相册展示 */}
        <div>
          <AlbumGallery />
        </div>
      </div>
    </div>
  );
}
