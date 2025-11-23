"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // DevTools 偵測和警告
  useEffect(() => {
    // 偵測 DevTools 開啟
    let devtools = { open: false };
    const threshold = 160;
    let warningShown = false;

    const checkDevTools = setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold ||
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          (window as any).__DEV_TOOLS_OPEN__ = true;

          if (!warningShown && process.env.NODE_ENV === 'production') {
            warningShown = true;
            console.warn(
              '%c⚠️ 安全警告',
              'color: red; font-size: 30px; font-weight: bold;',
              '\n此為管理後台，請勿嘗試未授權存取。\n所有活動都會被記錄。'
            );
          }
        }
      } else {
        devtools.open = false;
        (window as any).__DEV_TOOLS_OPEN__ = false;
      }
    }, 500);

    // 禁用右鍵選單（生產環境）
    const handleContextMenu = (e: MouseEvent) => {
      if (process.env.NODE_ENV === 'production') {
        e.preventDefault();
      }
    };

    // 禁用開發者快捷鍵（生產環境）
    const handleKeyDown = (e: KeyboardEvent) => {
      if (process.env.NODE_ENV === 'production') {
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'U')) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(checkDevTools);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "登入失敗");
      }

      // 登入成功，重定向到管理後台 (admin-new)
      router.push("/admin-new");
    } catch (error) {
      setError(error instanceof Error ? error.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <Image
              src="/logo-imgup.png"
              alt="duk.tw Logo"
              className={styles.logo}
              width={36}
              height={36}
              priority
            />
          </div>
          <h2 className={styles.title}>管理員登入</h2>
          <p className={styles.subtitle}>請輸入您的管理員帳號資訊</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <div>
              <label htmlFor="email" className={styles.srOnly}>
                電子郵件
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`${styles.input} ${styles.inputTop}`}
                placeholder="電子郵件地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className={styles.srOnly}>
                密碼
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`${styles.input} ${styles.inputBottom}`}
                placeholder="密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? (
                <svg
                  className={styles.loadingIcon}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className={styles.loadingCircle}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className={styles.loadingPath}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className={styles.buttonIcon}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"
                  />
                </svg>
              )}
              {loading ? "登入中..." : "登入"}
            </button>
          </div>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              此為管理員專用登入頁面，如有問題請聯繫系統管理員
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
