"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

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
  recentUploads: MappingItem[];
  weeklyStats: { date: string; count: number }[];
}

interface AdminData {
  id: string;
  email: string;
  username: string;
  role: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/auth/verify", {
        credentials: "include",
      });
      if (!response.ok) {
        router.push("/admin/login");
        return;
      }
      const data = await response.json();
      setAdminData(data.admin);
    } catch (error) {
      console.error("身份驗證失敗:", error);
      router.push("/admin/login");
    }
  };

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

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/admin/login");
    } catch (error) {
      console.error("登出失敗:", error);
    }
  };

  const handleCopyUrl = (hash: string) => {
    const url = `${window.location.origin}/${hash}`;
    navigator.clipboard.writeText(url);
    alert("網址已複製到剪貼簿");
  };

  const handleDeleteMapping = async (hash: string) => {
    if (!confirm("確定要刪除這個檔案嗎？")) return;

    try {
      const response = await fetch(`/api/admin/mappings/${hash}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        loadStats(); // 重新載入統計數據
        alert("刪除成功");
      } else {
        alert("刪除失敗");
      }
    } catch (error) {
      console.error("刪除失敗:", error);
      alert("刪除失敗");
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

  const getSystemStatus = () => {
    if (!stats) return "loading";
    // 簡單的系統狀態判斷邏輯
    if (stats.totalMappings > 1000) return "warning";
    return "online";
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>載入失敗</h3>
          <p>{error}</p>
          <button onClick={loadStats} className={styles.quickAction}>
            重新載入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.brandLeft}>
          <Image
            src="/logo-imgup.png"
            alt="duk.tw Logo"
            className={styles.logo}
            width={36}
            height={36}
            priority
          />
          <h1 className={styles.title}>
            duk.tw 管理儀表板 <span className={styles.brandTag}>Admin</span>
          </h1>
        </div>
        <div className={styles.headerRight}>
          {adminData && <span>歡迎，{adminData.username}</span>}
          <button onClick={handleLogout} className={styles.logoutButton}>
            登出
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* 統計數據卡片 */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📦</div>
              <div className={styles.statMeta}>
                <div className={styles.statNumber}>{stats.totalMappings}</div>
                <div className={styles.statLabel}>總檔案數</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📤</div>
              <div className={styles.statMeta}>
                <div className={styles.statNumber}>{stats.todayUploads}</div>
                <div className={styles.statLabel}>今日上傳</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>✅</div>
              <div className={styles.statMeta}>
                <div className={styles.statNumber}>{stats.activeMappings}</div>
                <div className={styles.statLabel}>活躍檔案</div>
              </div>
            </div>
          </div>

          {/* 主要內容區域 */}
          <div className={styles.contentGrid}>
            {/* 最近上傳列表 */}
            <div className={styles.mainPanel}>
              <h2 className={styles.sectionTitle}>最近上傳</h2>
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
                          {mapping.viewCount}
                        </td>
                        <td data-label="狀態">
                          {mapping.hasPassword ? "🔒" : ""}
                          {mapping.isExpired ? " ⏰" : ""}
                        </td>
                        <td data-label="時間">
                          {formatTime(mapping.createdAt)}
                        </td>
                        <td data-label="操作">
                          <div className={styles.uploadActions}>
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
                            <button
                              onClick={() => handleDeleteMapping(mapping.hash)}
                              className={`${styles.actionButton} ${styles.danger}`}
                            >
                              刪除
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

            {/* 側邊欄 */}
            <div className={styles.sidePanel}>
              <h2 className={styles.sectionTitle}>快速操作</h2>
              <div className={styles.quickActions}>
                <button
                  onClick={() => window.open("/", "_blank")}
                  className={styles.quickAction}
                >
                  🖼️ 上傳檔案
                </button>
                <button onClick={loadStats} className={styles.quickAction}>
                  🔄 刷新數據
                </button>
                <button
                  onClick={() => router.push("/admin/images")}
                  className={styles.quickAction}
                >
                  📁 管理所有檔案
                </button>
                <button
                  onClick={() => alert("系統設定功能開發中")}
                  className={styles.quickAction}
                >
                  ⚙️ 系統設定
                </button>
              </div>

              {/* 系統狀態 */}
              <div className={styles.systemStatus}>
                <h3 className={styles.sectionTitle}>系統狀態</h3>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>服務狀態</span>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className={styles.statusValue}>正常運行</span>
                    <div
                      className={`${styles.statusIndicator} ${styles.online}`}
                    ></div>
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>檔案狀態</span>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className={styles.statusValue}>
                      {getSystemStatus() === "warning" ? "接近上限" : "正常"}
                    </span>
                    <div
                      className={`${styles.statusIndicator} ${
                        getSystemStatus() === "warning"
                          ? styles.warning
                          : styles.online
                      }`}
                    ></div>
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>資料庫</span>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className={styles.statusValue}>已連接</span>
                    <div
                      className={`${styles.statusIndicator} ${styles.online}`}
                    ></div>
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>上次更新</span>
                  <span className={styles.statusValue}>
                    {new Date().toLocaleTimeString("zh-TW")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
