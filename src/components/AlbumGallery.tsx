'use client';

import { useEffect, useState } from 'react';

interface AlbumItem {
  id: string;
  mapping: {
    id: string;
    shortCode: string;
    imageUrl: string;
    filename: string;
  };
}

interface Album {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isPublic: boolean;
  imageCount: number;
  items: AlbumItem[];
}

export default function AlbumGallery() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');

  useEffect(() => {
    fetchAlbums();
  }, []);

  async function fetchAlbums() {
    try {
      const res = await fetch('/api/albums');
      const data = await res.json();

      if (data.success) {
        setAlbums(data.data);
      }
    } catch (err) {
      console.error('Failed to load albums:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createAlbum() {
    if (!newAlbumName.trim()) {
      alert('请输入相册名称');
      return;
    }

    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAlbumName,
          description: newAlbumDesc,
          isPublic: false,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setNewAlbumName('');
        setNewAlbumDesc('');
        setShowCreateModal(false);
        fetchAlbums();
      } else {
        alert('创建失败: ' + data.error);
      }
    } catch (err) {
      alert('网络错误');
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* 标题和创建按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">我的相册</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          创建相册
        </button>
      </div>

      {/* 相册网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {albums.map(album => (
          <div
            key={album.id}
            className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
          >
            {/* 相册封面 */}
            <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100">
              {album.items.length > 0 ? (
                <div className="grid grid-cols-2 gap-1 h-full p-2">
                  {album.items.slice(0, 4).map((item, idx) => (
                    <div
                      key={item.id}
                      className={`relative overflow-hidden rounded ${
                        album.items.length === 1 ? 'col-span-2 row-span-2' : ''
                      }`}
                    >
                      <img
                        src={item.mapping.imageUrl}
                        alt={item.mapping.filename}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">暂无图片</p>
                  </div>
                </div>
              )}

              {/* 默认相册标签 */}
              {album.isDefault && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
                  默认相册
                </div>
              )}
            </div>

            {/* 相册信息 */}
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-1">{album.name}</h3>
              {album.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{album.description}</p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {album.imageCount} 张图片
                </span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  album.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {album.isPublic ? '公开' : '私密'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* 空状态 */}
        {albums.length === 0 && (
          <div className="col-span-full text-center py-12">
            <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-500 mb-4">还没有创建相册</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-500 hover:text-blue-600 font-semibold"
            >
              创建你的第一个相册 →
            </button>
          </div>
        )}
      </div>

      {/* 创建相册模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">创建新相册</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                相册名称 *
              </label>
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="输入相册名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                相册描述
              </label>
              <textarea
                value={newAlbumDesc}
                onChange={(e) => setNewAlbumDesc(e.target.value)}
                placeholder="简单描述这个相册（可选）"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={createAlbum}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
