"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProxyImageUrl } from "@/utils/image-proxy";
import { useToast } from "@/contexts/ToastContext";
import styles from "./dashboard.module.css";
import ActivityTimeline from "./components/ActivityTimeline";

interface MappingItem {
  id: string;
  hash: string;
  filename: string;
  url: string;
  shortUrl: string;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  hasPassword: boolean;
}

interface StatsData {
  totalMappings: number;
  todayUploads: number;
  activeMappings: number;
  recentUploads: MappingItem[];
  weeklyStats: { date: string; count: number }[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Infinite scroll state
  const [galleryImages, setGalleryImages] = useState<MappingItem[]>([]);
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // URL Upload Modal state - 批量上傳
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlUploadLoading, setUrlUploadLoading] = useState(false);
  const [urlsText, setUrlsText] = useState(""); // 改成多行文字
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [uploadResults, setUploadResults] = useState<{url: string; status: 'pending' | 'success' | 'failed'; shortUrl?: string; error?: string}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadStats();
    loadGalleryImages(1);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/stats", {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || "載入統計數據失敗");
      }
    } catch (error) {
      console.error("載入統計數據失敗:", error);
      setError("載入統計數據失敗");
    } finally {
      setLoading(false);
    }
  };

  const loadGalleryImages = async (page: number) => {
    try {
      setGalleryLoading(true);
      const response = await fetch(
        `/api/admin/mappings?page=${page}&pageSize=20`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data.items)) {
        const newImages = data.data.items;
        if (newImages.length === 0 || newImages.length < 20) {
          setHasMore(false);
        }
        if (newImages.length > 0) {
          setGalleryImages((prev) =>
            page === 1 ? newImages : [...prev, ...newImages]
          );
          setGalleryPage(page);
        }
      } else {
        console.error("API 返回格式錯誤:", data);
        setHasMore(false);
      }
    } catch (error) {
      console.error("載入圖片失敗:", error);
      setHasMore(false);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const scrollBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight;

      // 當滾動到距離底部 100px 時開始載入
      if (scrollBottom < 100 && !galleryLoading && hasMore) {
        loadGalleryImages(galleryPage + 1);
      }
    },
    [galleryLoading, hasMore, galleryPage]
  );

  const handleCopyUrl = (hash: string) => {
    const url = `${window.location.origin}/${hash}`;
    navigator.clipboard.writeText(url);
    toast.success("網址已複製到剪貼簿");
  };

  // URL Upload functions
  const extractFilenameFromUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split("/");
      const filename = segments[segments.length - 1] || "image";
      return filename;
    } catch {
      return "image";
    }
  };

  const resetUrlModal = () => {
    setUrlsText("");
    setPassword("");
    setExpiresAt("");
    setUploadResults([]);
    setIsProcessing(false);
  };

  const handleOpenUrlModal = () => {
    resetUrlModal();
    setShowUrlModal(true);
  };

  const handleCloseUrlModal = () => {
    setShowUrlModal(false);
    setTimeout(resetUrlModal, 300);
  };

  // 批量處理網址上傳
  const handleBatchUrlUpload = async () => {
    if (!urlsText.trim()) {
      toast.error("請輸入至少一個圖片網址");
      return;
    }

    // 解析網址（每行一個）
    const urls = urlsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (urls.length === 0) {
      toast.error("請輸入有效的網址");
      return;
    }

    // 去重
    const uniqueUrls = [...new Set(urls)];

    // 初始化結果
    const initialResults = uniqueUrls.map(url => ({
      url,
      status: 'pending' as const
    }));
    setUploadResults(initialResults);
    setIsProcessing(true);

    // 批量處理（每次 3 個並發）
    const BATCH_SIZE = 3;
    const results = [...initialResults];

    for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
      const batch = uniqueUrls.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (url, idx) => {
          const globalIdx = i + idx;

          try {
            // 驗證 URL 格式
            new URL(url);

            const filename = extractFilenameFromUrl(url);

            const response = await fetch("/api/admin/shorten-image", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                url,
                filename,
                password: password || undefined,
                expiresAt: expiresAt || undefined,
              }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
              results[globalIdx] = {
                url,
                status: 'success',
                shortUrl: data.shortUrl
              };
            } else {
              results[globalIdx] = {
                url,
                status: 'failed',
                error: data.error || "上傳失敗"
              };
            }
          } catch (error: any) {
            results[globalIdx] = {
              url,
              status: 'failed',
              error: error.message || "無效的網址格式"
            };
          }

          // 更新結果
          setUploadResults([...results]);
        })
      );
    }

    setIsProcessing(false);

    // 統計結果
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    if (successCount > 0) {
      toast.success(`成功上傳 ${successCount} 張圖片${failedCount > 0 ? `，${failedCount} 張失敗` : ''}`);
      loadStats();
      loadGalleryImages(1);
    } else {
      toast.error("所有網址上傳失敗");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小時前`;
    if (minutes > 0) return `${minutes} 分鐘前`;
    return "剛剛";
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h3>載入失敗</h3>
        <p>{error}</p>
        <button onClick={loadStats} className={styles.retryButton}>
          重新載入
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>儀表板總覽</h1>
          <p className={styles.pageSubtitle}>管理您的圖片服務平台</p>
        </div>
        <div className={styles.topBarActions}>
          <button onClick={handleOpenUrlModal} className={styles.refreshButton}>
            🌐 網址上傳
          </button>
          <button onClick={loadStats} className={styles.refreshButton}>
            🔄 刷新數據
          </button>
        </div>
      </div>

      {/* Main Dashboard Layout: Left Gallery + Right Stats */}
      <div className={styles.dashboardLayout}>
        {/* Left: Image Gallery Carousel */}
        <div className={styles.gallerySection}>
          <div className={styles.gallerySectionHeader}>
            <h3 className={styles.gallerySectionTitle}>📸 最新上傳</h3>
            <button
              onClick={() => router.push("/admin-new/images")}
              className={styles.galleryViewAll}
            >
              查看全部 →
            </button>
          </div>
          <div className={styles.galleryCarousel} onScroll={handleScroll}>
            {Array.isArray(galleryImages) && galleryImages.map((mapping) => (
              <div key={mapping.id} className={styles.galleryItem}>
                <div className={styles.galleryImageWrap}>
                  <img
                    src={getProxyImageUrl(mapping.hash)}
                    alt={mapping.filename}
                    className={styles.galleryImage}
                    loading="lazy"
                  />
                  <div className={styles.galleryOverlay}>
                    <div className={styles.galleryInfo}>
                      <div className={styles.galleryFilename}>
                        {mapping.filename.length > 25
                          ? `${mapping.filename.substring(0, 25)}...`
                          : mapping.filename}
                      </div>
                      <div className={styles.galleryMeta}>
                        {mapping.hasPassword && <span>🔒</span>}
                        {mapping.isExpired && <span>⏰</span>}
                      </div>
                    </div>
                    <div className={styles.galleryActions}>
                      <button
                        onClick={() => handleCopyUrl(mapping.hash)}
                        className={styles.galleryButton}
                        title="複製連結"
                      >
                        📋
                      </button>
                      <button
                        onClick={() =>
                          window.open(`/${mapping.hash}`, "_blank")
                        }
                        className={styles.galleryButton}
                        title="預覽"
                      >
                        🔍
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/admin-new/images/${mapping.hash}`)
                        }
                        className={styles.galleryButton}
                        title="詳情"
                      >
                        ℹ️
                      </button>
                    </div>
                  </div>
                </div>
                <div className={styles.galleryTimestamp}>
                  {formatTime(mapping.createdAt)}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {galleryLoading && (
              <div className={styles.galleryLoadingIndicator}>
                <div className={styles.galleryLoader}>載入更多...</div>
              </div>
            )}

            {/* End indicator */}
            {!hasMore && galleryImages.length > 0 && (
              <div className={styles.galleryEndIndicator}>
                已載入全部圖片 ({galleryImages.length} 張)
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats & Info */}
        <div className={styles.statsSection}>
          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#3b82f6" }}>
                📦
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>
                  {stats.totalMappings.toLocaleString()}
                </div>
                <div className={styles.statLabel}>總檔案數</div>
                <div className={styles.statChange}>
                  +{stats.todayUploads} 今日
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#10b981" }}>
                📤
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>
                  {stats.todayUploads.toLocaleString()}
                </div>
                <div className={styles.statLabel}>今日上傳</div>
                <div className={styles.statChange}>本日統計</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#8b5cf6" }}>
                ✅
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>
                  {stats.activeMappings.toLocaleString()}
                </div>
                <div className={styles.statLabel}>活躍檔案</div>
                <div className={styles.statChange}>未過期</div>
              </div>
            </div>

          </div>

          {/* Activity Timeline - Replacing Quick Links */}
          <ActivityTimeline
            recentUploads={stats.recentUploads}
            weeklyStats={stats.weeklyStats}
          />
        </div>
      </div>

      {/* URL Upload Modal - 批量上傳 */}
      {showUrlModal && (
        <div className={styles.modalOverlay} onClick={handleCloseUrlModal}>
          <div className={styles.batchModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>🌐 批量網址上傳</h3>
              <button onClick={handleCloseUrlModal} className={styles.closeButton}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>
                  圖片網址（每行一個）*
                  {urlsText && (
                    <span style={{marginLeft: '10px', color: '#666', fontSize: '13px'}}>
                      {urlsText.split('\n').filter(l => l.trim()).length} 個網址
                    </span>
                  )}
                </label>
                <textarea
                  placeholder="貼上圖片網址，每行一個&#10;例如：&#10;https://example.com/image1.jpg&#10;https://example.com/image2.png&#10;https://example.com/image3.webp"
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                  className={styles.textarea}
                  disabled={isProcessing}
                  rows={8}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    lineHeight: '1.6'
                  }}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{flex: 1}}>
                  <label>密碼保護（選填）</label>
                  <input
                    type="password"
                    placeholder="設定密碼"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    disabled={isProcessing}
                  />
                </div>

                <div className={styles.formGroup} style={{flex: 1}}>
                  <label>過期時間（選填）</label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className={styles.input}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              {/* 結果列表 */}
              {uploadResults.length > 0 && (
                <div className={styles.resultsSection}>
                  <div className={styles.resultsHeader}>
                    <span>上傳結果</span>
                    <span>
                      ✅ {uploadResults.filter(r => r.status === 'success').length} ·
                      ❌ {uploadResults.filter(r => r.status === 'failed').length} ·
                      ⏳ {uploadResults.filter(r => r.status === 'pending').length}
                    </span>
                  </div>
                  <div className={styles.resultsList}>
                    {uploadResults.map((result, idx) => (
                      <div
                        key={idx}
                        className={`${styles.resultItem} ${styles[result.status]}`}
                      >
                        <div className={styles.resultIcon}>
                          {result.status === 'success' && '✅'}
                          {result.status === 'failed' && '❌'}
                          {result.status === 'pending' && '⏳'}
                        </div>
                        <div className={styles.resultContent}>
                          <div className={styles.resultUrl}>{result.url}</div>
                          {result.status === 'success' && result.shortUrl && (
                            <div className={styles.resultShortUrl}>
                              {result.shortUrl}
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(result.shortUrl!);
                                  toast.success("已複製");
                                }}
                                className={styles.miniCopyBtn}
                              >
                                📋
                              </button>
                            </div>
                          )}
                          {result.status === 'failed' && result.error && (
                            <div className={styles.resultError}>{result.error}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  onClick={handleCloseUrlModal}
                  className={styles.cancelButton}
                  disabled={isProcessing}
                >
                  {uploadResults.length > 0 ? '關閉' : '取消'}
                </button>
                <button
                  onClick={handleBatchUrlUpload}
                  className={styles.submitButton}
                  disabled={isProcessing || !urlsText.trim()}
                >
                  {isProcessing ? "處理中..." : "開始上傳"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
