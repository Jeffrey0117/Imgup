"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./UserStatus.module.css";

interface UserInfo {
  username: string;
  email: string;
  tier: string;
  totalUploads: number;
  isActive: boolean;
  warningCount: number;
  restrictedUntil: string | null;
}

export default function UserStatus() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/user/auth/status");
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user);
      }
    } catch (error) {
      console.error("檢查登入狀態失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/user/auth/logout", { method: "POST" });
      setUserInfo(null);
      router.refresh();
    } catch (error) {
      console.error("登出失敗:", error);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "guest":
        return { label: "訪客", color: "#6b7280", limit: "10/分鐘" };
      case "member":
        return { label: "會員", color: "#3b82f6", limit: "30/分鐘" };
      case "premium":
        return { label: "付費", color: "#f59e0b", limit: "100/分鐘" };
      default:
        return { label: "訪客", color: "#6b7280", limit: "10/分鐘" };
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>載入中...</div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className={styles.container}>
        <div className={styles.authButtons}>
          <a href="/login" className={styles.loginButton}>
            登入
          </a>
          <a href="/register" className={styles.registerButton}>
            註冊
          </a>
        </div>
      </div>
    );
  }

  const tierInfo = getTierBadge(userInfo.tier);

  return (
    <div className={styles.container}>
      <div className={styles.userCard}>
        <button
          className={styles.userButton}
          onClick={() => setShowMenu(!showMenu)}
        >
          <div className={styles.avatar}>
            {userInfo.username.charAt(0).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.username}>{userInfo.username}</span>
            <span
              className={styles.tierBadge}
              style={{ backgroundColor: tierInfo.color }}
            >
              {tierInfo.label}
            </span>
          </div>
          <svg
            className={styles.chevron}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showMenu && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <div className={styles.dropdownEmail}>{userInfo.email}</div>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>上傳限制</span>
                <span className={styles.statValue}>{tierInfo.limit}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>總上傳數</span>
                <span className={styles.statValue}>{userInfo.totalUploads}</span>
              </div>
              {userInfo.warningCount > 0 && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>警告次數</span>
                  <span className={styles.statValueWarn}>
                    {userInfo.warningCount}
                  </span>
                </div>
              )}
              {userInfo.restrictedUntil && (
                <div className={styles.warning}>
                  ⚠️ 帳號受限至{" "}
                  {new Date(userInfo.restrictedUntil).toLocaleString("zh-TW")}
                </div>
              )}
            </div>
            <div className={styles.divider}></div>
            <button className={styles.logoutButton} onClick={handleLogout}>
              <svg
                className={styles.logoutIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              登出
            </button>
          </div>
        )}
      </div>
    </div>
  );
}