"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("密碼與確認密碼不符");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("密碼長度至少需要 8 個字元");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "註冊失敗");
      }

      router.push("/login?registered=true");
    } catch (error) {
      setError(error instanceof Error ? error.message : "註冊失敗");
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
          <h2 className={styles.title}>註冊會員</h2>
          <p className={styles.subtitle}>建立帳號享有更高上傳限制</p>
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
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="username" className={styles.srOnly}>
                使用者名稱
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className={styles.input}
                placeholder="使用者名稱"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
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
                autoComplete="new-password"
                required
                className={styles.input}
                placeholder="密碼 (至少 8 個字元)"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className={styles.srOnly}>
                確認密碼
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`${styles.input} ${styles.inputBottom}`}
                placeholder="確認密碼"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.benefitsList}>
            <p className={styles.benefitsTitle}>會員權益：</p>
            <ul>
              <li>⚡ 訪客限制：每分鐘 10 次上傳</li>
              <li>👤 會員限制：每分鐘 30 次上傳</li>
              <li>💎 付費會員：每分鐘 100 次上傳</li>
            </ul>
          </div>

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
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              )}
              {loading ? "註冊中..." : "註冊"}
            </button>
          </div>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              已經有帳號了？{" "}
              <a href="/login" className={styles.link}>
                登入
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}