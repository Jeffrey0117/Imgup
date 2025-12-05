"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PreviewClient, { Mapping } from "./PreviewClient";
import styles from "../page.module.css";

interface PreviewClientWrapperProps {
  hash: string;
  initialMapping: Mapping | null;
}

export default function PreviewClientWrapper({
  hash,
  initialMapping,
}: PreviewClientWrapperProps) {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  // 檢查 URL 參數是否標記為過期
  useEffect(() => {
    const isExpired = searchParams.get("expired") === "true";
    if (isExpired) {
      setError("這個連結已經過期了");
    }
  }, [searchParams]);

  // 如果有過期標記
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorPage}>
          <div className={styles.errorIcon}>
            <img
              src="/logo-imgup.png"
              alt="duk.tw Logo"
              className={styles.errorLogo}
            />
          </div>
          <h2 className={styles.errorTitle}>哎呀！</h2>
          <p className={styles.errorMessage}>{error}</p>
          <div className={styles.errorHint}>
            <p>可能的原因：</p>
            <ul>
              <li>連結輸入錯誤</li>
              <li>圖片已被刪除</li>
              <li>連結已過期</li>
            </ul>
          </div>
          <a href="/" className={styles.backLink}>
            回到首頁
          </a>
        </div>
      </div>
    );
  }

  // 如果沒有 mapping 資料
  if (!initialMapping) {
    return (
      <div className={styles.container}>
        <div className={styles.errorPage}>
          <div className={styles.errorIcon}>
            <img
              src="/logo-imgup.png"
              alt="duk.tw Logo"
              className={styles.errorLogo}
            />
          </div>
          <h2 className={styles.errorTitle}>哎呀！</h2>
          <p className={styles.errorMessage}>找不到這個連結</p>
          <div className={styles.errorHint}>
            <p>可能的原因：</p>
            <ul>
              <li>連結輸入錯誤</li>
              <li>圖片已被刪除</li>
              <li>連結已過期</li>
            </ul>
          </div>
          <a href="/" className={styles.backLink}>
            回到首頁
          </a>
        </div>
      </div>
    );
  }

  return <PreviewClient mapping={initialMapping} hash={hash} />;
}
