"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

interface MappingItem {
  id: string;
  hash: string;
  filename: string;
  url: string;
  shortUrl: string;
  createdAt: string;
  expiresAt: string | null;
  viewCount: number;
  isExpired: boolean;
  hasPassword: boolean;
}

interface StatsData {
  totalMappings: number;
  todayUploads: number;
  activeMappings: number;
  totalViews: number;
  recentUploads: MappingItem[];
  weeklyStats: { date: string; count: number }[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
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

  const handleCopyUrl = (hash: string) => {
    const url = `${window.location.origin}/${hash}`;
    navigator.clipboard.writeText(url);
    alert("網址已複製到剪貼簿");
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

  return (
    <div>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>儀表板總覽</h1>
          <p className={styles.pageSubtitle}>管理您的圖片服務平台</p>
        </div>
        <div className={styles.topBarActions}>
          <button onClick={loadStats} className={styles.refreshButton}>
            🔄 刷新數據
          </button>
        </div>
      </div>

      {stats && (
        <>
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

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#f59e0b" }}>
                👁️
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>
                  {(stats.totalViews / 1000000).toFixed(1)}M
                </div>
                <div className={styles.statLabel}>總瀏覽數</div>
                <div className={styles.statChange}>累計統計</div>
              </div>
            </div>
          </div>

          {/* Recent Uploads */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>最近上傳</h2>
              <button
                onClick={() => router.push("/admin-new/images")}
                className={styles.viewAllButton}
              >
                查看全部 →
              </button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>檔名</th>
                    <th>短鏈</th>
                    <th>瀏覽</th>
                    <th>狀態</th>
                    <th>時間</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUploads.map((mapping) => (
                    <tr key={mapping.id}>
                      <td
                        className={styles.fileName}
                        data-label="檔名"
                        title={mapping.filename}
                      >
                        {mapping.filename}
                      </td>
                      <td data-label="短鏈">
                        <a
                          href={`/${mapping.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.hashLink}
                        >
                          /{mapping.hash}
                        </a>
                      </td>
                      <td className={styles.count} data-label="瀏覽">
                        {mapping.viewCount.toLocaleString()}
                      </td>
                      <td data-label="狀態">
                        <div className={styles.statusBadges}>
                          {mapping.hasPassword && (
                            <span className={styles.badge}>🔒</span>
                          )}
                          {mapping.isExpired && (
                            <span className={styles.badge}>⏰</span>
                          )}
                        </div>
                      </td>
                      <td data-label="時間">
                        {formatTime(mapping.createdAt)}
                      </td>
                      <td data-label="操作">
                        <div className={styles.actions}>
                          <button
                            onClick={() => handleCopyUrl(mapping.hash)}
                            className={styles.actionButton}
                          >
                            複製
                          </button>
                          <button
                            onClick={() =>
                              window.open(`/${mapping.hash}`, "_blank")
                            }
                            className={styles.actionButton}
                          >
                            預覽
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stats.recentUploads.length === 0 && (
                    <tr>
                      <td colSpan={6} className={styles.emptyRow}>
                        暫無上傳記錄
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
