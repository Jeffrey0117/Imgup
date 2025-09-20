"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { isValidHash } from "../../../utils/hash";
import styles from "../page.module.css";

interface Props {
  params: { hash: string };
}

export default function PreviewPage({ params }: Props) {
  const [mapping, setMapping] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const fetchMapping = async () => {
      const hash = params.hash;
      if (!isValidHash(hash)) {
        setError("無效的連結格式");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/mapping/${hash}`);
        if (!res.ok) {
          throw new Error("找不到對應的圖片或連結已過期");
        }
        const data = await res.json();

        if (data.password) {
          setPasswordRequired(true);
        }
        setMapping(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMapping();
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
          <h2>
            <img
              src="/logo-imgup.png"
              alt="Logo"
              style={{
                display: "inline",
                height: "1.2em",
                marginRight: "0.3em",
              }}
            />
            哎呀！
          </h2>
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
              type="text"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="請輸入 4 位數密碼"
              pattern="[0-9]{4}"
              maxLength={4}
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
          <h1>
            <img
              src="/logo-imgup.png"
              alt="Logo"
              style={{
                display: "inline",
                height: "1.2em",
                marginRight: "0.3em",
              }}
            />
            圖鴨分享
          </h1>
          <p className={styles.uploadTime}>
            上傳時間:{" "}
            {new Date(mapping.createdAt).toLocaleString("zh-TW", {
              timeZone: "Asia/Taipei",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
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
              const shortUrl = `${window.location.origin}/${params.hash}`;
              navigator.clipboard.writeText(shortUrl);
              alert("短網址已複製到剪貼簿");
            }}
            className={styles.actionBtn}
          >
            複製短網址
          </button>
          <button
            onClick={() => {
              const directUrl = `${window.location.origin}/${params.hash}?direct=true`;
              navigator.clipboard.writeText(directUrl);
              alert("圖片直連已複製到剪貼簿");
            }}
            className={styles.actionBtn}
          >
            複製圖片直連
          </button>
          <a href="/" className={styles.backLink}>
            回到首頁
          </a>
        </div>
      </div>
    </div>
  );
}
