'use client';

import { useEffect, useState } from 'react';

interface ConsentStatus {
  dataCollection: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

interface UserSettings {
  email: string;
  username: string;
  membershipPlan: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchConsent();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchConsent() {
    try {
      const res = await fetch('/api/privacy/consent');
      const data = await res.json();
      if (data.success) {
        setConsent(data.data);
      }
    } catch (err) {
      console.error('Failed to load consent:', err);
    }
  }

  async function updateConsent(type: keyof ConsentStatus, value: boolean) {
    try {
      const res = await fetch('/api/privacy/consent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [type]: value }),
      });

      const data = await res.json();
      if (data.success) {
        setConsent(data.data);
      } else {
        alert('更新失败: ' + data.error);
      }
    } catch (err) {
      alert('网络错误');
    }
  }

  async function exportData() {
    setExportLoading(true);
    try {
      const res = await fetch('/api/privacy/export', {
        method: 'POST',
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert('✅ 数据导出成功');
      } else {
        const data = await res.json();
        alert('导出失败: ' + data.error);
      }
    } catch (err) {
      alert('网络错误');
    } finally {
      setExportLoading(false);
    }
  }

  async function deleteAccount() {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/privacy/delete', {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        alert('✅ 账户已删除');
        // Redirect to home or logout
        window.location.href = '/';
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (err) {
      alert('网络错误');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">账户设置</h1>
          <p className="mt-2 text-gray-600">管理您的账户信息、隐私设置和数据</p>
        </div>

        {/* 账户信息 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              账户信息
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">用户名</p>
                <p className="text-lg font-medium text-gray-900">{settings?.username || 'N/A'}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">邮箱</p>
                <p className="text-lg font-medium text-gray-900">{settings?.email || 'N/A'}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">会员计划</p>
                <p className="text-lg font-medium text-gray-900">{settings?.membershipPlan || 'Free Trial'}</p>
              </div>
              <a href="/membership" className="text-blue-500 hover:text-blue-600 font-semibold">
                升级会员 →
              </a>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">注册时间</p>
                <p className="text-lg font-medium text-gray-900">
                  {settings?.createdAt ? new Date(settings.createdAt).toLocaleDateString('zh-CN') : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 隐私与同意设置 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              隐私设置
            </h2>
            <p className="text-sm text-gray-600 mt-1">根据 GDPR 规定，您可以控制我们如何使用您的数据</p>
          </div>
          <div className="p-6 space-y-4">
            {consent && (
              <>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">数据收集</p>
                    <p className="text-sm text-gray-600">允许收集使用数据以改进服务</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.dataCollection}
                      onChange={(e) => updateConsent('dataCollection', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">分析统计</p>
                    <p className="text-sm text-gray-600">帮助我们了解功能使用情况</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.analytics}
                      onChange={(e) => updateConsent('analytics', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">营销通讯</p>
                    <p className="text-sm text-gray-600">接收产品更新和优惠信息</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.marketing}
                      onChange={(e) => updateConsent('marketing', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  最后更新: {new Date(consent.updatedAt).toLocaleString('zh-CN')}
                </p>
              </>
            )}
          </div>
        </div>

        {/* GDPR 数据管理 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              数据管理
            </h2>
            <p className="text-sm text-gray-600 mt-1">根据 GDPR，您有权访问、导出和删除您的个人数据</p>
          </div>
          <div className="p-6 space-y-4">
            {/* 导出数据 */}
            <div className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">导出您的数据</p>
                <p className="text-sm text-gray-600 mt-1">
                  下载包含您所有个人信息、上传记录、活动日志的 JSON 文件
                </p>
              </div>
              <button
                onClick={exportData}
                disabled={exportLoading}
                className="ml-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {exportLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    导出中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    导出数据
                  </>
                )}
              </button>
            </div>

            {/* 删除账户 */}
            <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-red-900">删除您的账户</p>
                <p className="text-sm text-red-700 mt-1">
                  ⚠️ 此操作不可逆！将永久删除您的账户和所有相关数据
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="ml-4 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除账户
              </button>
            </div>
          </div>
        </div>

        {/* 安全信息 */}
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-gray-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-gray-900">关于您的隐私</p>
              <p className="text-sm text-gray-600 mt-1">
                我们遵守 GDPR（通用数据保护条例）和其他隐私法规。您的数据安全是我们的首要任务。
                我们使用加密技术保护您的信息，并且不会在未经您明确同意的情况下与第三方共享您的数据。
              </p>
              <a href="/privacy-policy" className="text-blue-500 hover:text-blue-600 text-sm font-semibold mt-2 inline-block">
                查看完整隐私政策 →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 rounded-full p-3 mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">确认删除账户？</h3>
            </div>

            <p className="text-gray-700 mb-6">
              此操作将永久删除：
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
              <li>所有上传的图片和文件</li>
              <li>相册和收藏</li>
              <li>会员订阅和发票</li>
              <li>活动日志和历史记录</li>
              <li>个人信息和账户设置</li>
            </ul>

            <p className="text-red-600 font-semibold mb-6">
              ⚠️ 此操作不可撤销，请谨慎操作！
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    删除中...
                  </>
                ) : (
                  '确认删除'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
