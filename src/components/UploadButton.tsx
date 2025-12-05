'use client';

import { useState, useRef, useCallback } from 'react';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

interface UploadButtonProps {
  onUploadComplete?: (urls: string[]) => void;
  albumId?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
}

export default function UploadButton({
  onUploadComplete,
  albumId,
  maxFiles = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  className = '',
}: UploadButtonProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { fingerprint, isLoading: fingerprintLoading, fingerprintData } = useDeviceFingerprint();

  const checkQuota = async (fileCount: number, totalSize: number) => {
    try {
      const res = await fetch('/api/quota');
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      const { usage, limits } = data.data;

      // Check if can upload
      if (!usage.canUpload) {
        return { allowed: false, reason: '已达到上传限制' };
      }

      // Check daily limit
      if (usage.uploadedToday + fileCount > limits.uploadPerDay) {
        return {
          allowed: false,
          reason: `超过每日上传限制（剩余 ${usage.remainingUploads} 次）`,
        };
      }

      // Check storage
      const estimatedStorageNeeded = totalSize;
      const remainingStorageBytes = parseFloat(usage.remainingStorage.replace(/[^\d.]/g, '')) * 1024 * 1024;

      if (estimatedStorageNeeded > remainingStorageBytes) {
        return {
          allowed: false,
          reason: `存储空间不足（剩余 ${usage.remainingStorage}）`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Failed to check quota:', error);
      return { allowed: false, reason: '无法验证配额状态' };
    }
  };

  const uploadFile = async (file: File): Promise<UploadProgress> => {
    const formData = new FormData();
    formData.append('file', file);

    if (albumId) {
      formData.append('albumId', albumId);
    }

    // Add device fingerprint data
    if (fingerprint) {
      formData.append('deviceFingerprint', fingerprint);
    }

    if (fingerprintData) {
      formData.append('deviceData', JSON.stringify(fingerprintData));
    }

    try {
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setUploads(prev =>
              prev.map(u =>
                u.filename === file.name
                  ? { ...u, progress: Math.round(progress) }
                  : u
              )
            );
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve({
                filename: file.name,
                progress: 100,
                status: 'success',
                url: response.data.url,
              });
            } else {
              resolve({
                filename: file.name,
                progress: 0,
                status: 'error',
                error: response.error || 'Upload failed',
              });
            }
          } else {
            resolve({
              filename: file.name,
              progress: 0,
              status: 'error',
              error: `Upload failed: ${xhr.status}`,
            });
          }
        });

        xhr.addEventListener('error', () => {
          resolve({
            filename: file.name,
            progress: 0,
            status: 'error',
            error: 'Network error',
          });
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
    } catch (error) {
      return {
        filename: file.name,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Reset errors
    setQuotaError(null);

    // Filter by accepted types
    const validFiles = Array.from(files).filter(file =>
      acceptedTypes.includes(file.type)
    );

    if (validFiles.length === 0) {
      setQuotaError('没有有效的图片文件');
      return;
    }

    if (validFiles.length > maxFiles) {
      setQuotaError(`一次最多上传 ${maxFiles} 个文件`);
      return;
    }

    // Calculate total size
    const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);

    // Check quota
    const quotaCheck = await checkQuota(validFiles.length, totalSize);
    if (!quotaCheck.allowed) {
      setQuotaError(quotaCheck.reason || '上传失败');
      return;
    }

    // Initialize upload progress
    const initialUploads: UploadProgress[] = validFiles.map(file => ({
      filename: file.name,
      progress: 0,
      status: 'uploading',
    }));
    setUploads(initialUploads);

    // Upload all files
    const results = await Promise.all(validFiles.map(uploadFile));

    setUploads(results);

    // Callback with successful URLs
    const successfulUrls = results
      .filter(r => r.status === 'success' && r.url)
      .map(r => r.url!);

    if (successfulUrls.length > 0 && onUploadComplete) {
      onUploadComplete(successfulUrls);
    }

    // Clear after 3 seconds
    setTimeout(() => {
      setUploads([]);
    }, 3000);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className={className}>
      {/* Upload Button */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        {fingerprintLoading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-600">正在初始化设备认证...</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mb-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-all inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                选择图片
              </button>
            </div>
            <p className="text-sm text-gray-600">
              或拖放图片到这里
            </p>
            <p className="text-xs text-gray-500 mt-2">
              支持 JPG、PNG、GIF、WebP 格式，最多 {maxFiles} 个文件
            </p>
          </>
        )}
      </div>

      {/* Quota Error */}
      {quotaError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">{quotaError}</p>
            <a href="/membership" className="text-xs text-red-600 hover:text-red-700 font-semibold mt-1 inline-block">
              升级会员以获取更多配额 →
            </a>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploads.map((upload, idx) => (
            <div key={idx} className="bg-white border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center flex-1 min-w-0">
                  {upload.status === 'uploading' && (
                    <svg className="animate-spin h-4 w-4 text-blue-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {upload.status === 'success' && (
                    <svg className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {upload.status === 'error' && (
                    <svg className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {upload.filename}
                  </span>
                </div>
                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {upload.progress}%
                </span>
              </div>

              {/* Progress Bar */}
              {upload.status === 'uploading' && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}

              {/* Error Message */}
              {upload.status === 'error' && upload.error && (
                <p className="text-xs text-red-600 mt-1">{upload.error}</p>
              )}

              {/* Success URL */}
              {upload.status === 'success' && upload.url && (
                <div className="flex items-center mt-1">
                  <input
                    type="text"
                    value={upload.url}
                    readOnly
                    className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded flex-1 mr-2"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(upload.url!);
                      alert('已复制到剪贴板');
                    }}
                    className="text-xs text-blue-500 hover:text-blue-600 font-semibold"
                  >
                    复制
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
