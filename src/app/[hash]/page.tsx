"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { isValidHash } from "../../utils/hash";
import { getImageMapping, cleanExpiredMappings } from "../../utils/storage";
import type { UploadedImage } from "../../utils/storage";
import styles from "./page.module.css";

interface Props {
  params: { hash: string };
}

export default function HashPage({ params }: Props) {
  const [mapping, setMapping] = useState<UploadedImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const hash = params.hash;

    // 驗證 hash 格式
    if (!isValidHash(hash)) {
      setError("無效的連結格式");
      setLoading(false);
      return;
    }

    // 清理過期的映射
    cleanExpiredMappings();

    // 獲取映射資料
    const imageMapping = getImageMapping(hash);

    if (!imageMapping) {
      setError("找不到對應的圖片或連結已過期");
      setLoading(false);
      return;
    }

    // 檢查是否需要密碼
    if (imageMapping.password) {
      setPasswordRequired(true);
      setMapping(imageMapping);
      setLoading(false);
      return;
    }

    setMapping(imageMapping);
    setLoading(false);
  }, [params.hash]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapping) return;

    // 在實際應用中應該使用雜湊比較
    if (passwordInput === mapping.password) {
      setPasswordRequired(false);
    } else {
      setError("密碼錯誤");
    }
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
          <h2>🦆 哎呀！</h2>
          <p>{error}</p>
          <a href="/" className={styles.backLink}>
            回到首頁
          </a>
        </div>
      </div>
    );
  }

  if (passwordRequired && mapping) {
    return (
      <div className={styles.container}>
        <div className={styles.passwordForm}>
          <h2>🔒 需要密碼</h2>
          <p>這張圖片受到密碼保護</p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="請輸入密碼"
              className={styles.passwordInput}
              required
            />
            <button type="submit" className={styles.submitBtn}>
              確認
            </button>
          </form>
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      </div>
    );
  }

  if (!mapping) {
    notFound();
  }

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        <div className={styles.header}>
          <h1>🦆 圖鴨分享</h1>
          <p className={styles.filename}>{mapping.filename}</p>
          <p className={styles.uploadTime}>
            上傳時間: {new Date(mapping.createdAt).toLocaleString("zh-TW")}
          </p>
        </div>

        <div className={styles.imageWrapper}>
          <img
            src={mapping.url}
            alt={mapping.filename}
            className={styles.image}
            onError={(e) => {
              setError("圖片載入失敗");
            }}
          />
        </div>

        <div className={styles.actions}>
          <a
            href={mapping.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionBtn}
          >
            在新視窗開啟
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText(mapping.url);
              alert("圖片連結已複製到剪貼簿");
            }}
            className={styles.actionBtn}
          >
            複製圖片連結
          </button>
          <a href="/" className={styles.backLink}>
            回到首頁
          </a>
        </div>
      </div>
    </div>
  );
}
