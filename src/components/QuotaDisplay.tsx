'use client';

import { useEffect, useState } from 'react';

interface QuotaData {
  limits: {
    uploadPerDay: number;
    uploadPerHour: number;
    uploadPerMinute: number;
    maxFileSize: string;
    maxStorageSize: string;
    imageRetentionDays: number;
  };
  usage: {
    uploadedToday: number;
    uploadedThisHour: number;
    uploadedThisMinute: number;
    storageUsed: string;
    remainingUploads: number;
    remainingStorage: string;
    canUpload: boolean;
  };
  percentages: {
    dailyUploads: number;
    storage: number;
  };
}

export default function QuotaDisplay() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuota() {
      try {
        const res = await fetch('/api/quota');
        const data = await res.json();

        if (data.success) {
          setQuota(data.data);
        } else {
          setError(data.error || 'Failed to load quota');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }

    fetchQuota();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">❌ {error}</p>
      </div>
    );
  }

  if (!quota) return null;

  const { limits, usage, percentages } = quota;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">配额使用情况</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          usage.canUpload ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {usage.canUpload ? '✅ 可上传' : '❌ 已达限制'}
        </span>
      </div>

      {/* 每日上传进度 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">今日上传</span>
          <span className="text-sm text-gray-800 font-semibold">
            {usage.uploadedToday} / {limits.uploadPerDay}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              percentages.dailyUploads >= 90 ? 'bg-red-500' :
              percentages.dailyUploads >= 70 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentages.dailyUploads, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          剩余 {usage.remainingUploads} 次上传
        </p>
      </div>

      {/* 存储空间进度 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">存储空间</span>
          <span className="text-sm text-gray-800 font-semibold">
            {usage.storageUsed} / {limits.maxStorageSize}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              percentages.storage >= 90 ? 'bg-red-500' :
              percentages.storage >= 70 ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentages.storage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          剩余 {usage.remainingStorage}
        </p>
      </div>

      {/* 速率限制 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">每小时</p>
          <p className="text-lg font-bold text-gray-800">
            {usage.uploadedThisHour} / {limits.uploadPerHour}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">每分钟</p>
          <p className="text-lg font-bold text-gray-800">
            {usage.uploadedThisMinute} / {limits.uploadPerMinute}
          </p>
        </div>
      </div>

      {/* 计划限制 */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">当前计划限制</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">最大文件:</span>
            <span className="ml-2 font-medium text-gray-800">{limits.maxFileSize}</span>
          </div>
          <div>
            <span className="text-gray-500">保留期:</span>
            <span className="ml-2 font-medium text-gray-800">{limits.imageRetentionDays}天</span>
          </div>
        </div>
      </div>

      {/* 升级提示 */}
      {percentages.dailyUploads >= 80 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            💡 <strong>提示:</strong> 您的配额即将用完，考虑升级会员计划以获得更多配额
          </p>
          <button className="mt-2 text-sm text-blue-600 font-semibold hover:underline">
            查看会员计划 →
          </button>
        </div>
      )}
    </div>
  );
}
