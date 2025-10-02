"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../page.module.css";

export interface Mapping {
  hash: string;
  url: string;
  filename: string;
  fileExtension?: string | null;
  createdAt: string; // ISO string from server
  expiresAt?: string | null;
  password?: string | null;
  shortUrl: string;
}

interface PreviewClientProps {
  mapping: Mapping;
  hash: string;
}

export default function PreviewClient({ mapping, hash }: PreviewClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(!!mapping.password);
  const [passwordInput, setPasswordInput] = useState("");
  // 僅用代理短鏈作為圖片來源，避免任何情況下暴露原始來源
  const [imageSrc, setImageSrc] = useState<string>("");
  const imageRef = useRef<HTMLImageElement>(null);

  // 規範化副檔名：確保有 dot 且為小寫，若不存在則為空字串
  const normalizedExt = useMemo(() => {
    const raw = (mapping?.fileExtension || "").toString().trim();
    if (!raw) return "";
    const ext = raw.startsWith(".") ? raw : `.${raw}`;
    return ext.toLowerCase();
  }, [mapping?.fileExtension]);

  // 可複製/分享的短網址（一定帶副檔名的版本）
  const shortUrlWithExt = useMemo(() => {
    try {
      const origin = window.location.origin;
      return `${origin}/${hash}${normalizedExt}`;
    } catch {
      return `/${hash}${normalizedExt}`;
    }
  }, [hash, normalizedExt]);

  // 僅在客戶端建立代理短鏈，避免在 SSR 階段存取 window
  useEffect(() => {
    try {
      setImageSrc(shortUrlWithExt);
    } catch {
      // 忽略（保持為空字串以避免回退到真實來源）
    }
  }, [shortUrlWithExt]);

  // 右鍵自訂選單（僅在客戶端掛載）
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (imageRef.current && imageRef.current.contains(e.target as Node)) {
        e.preventDefault();

        const existingMenu = document.getElementById("custom-context-menu");
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement("div");
        menu.id = "custom-context-menu";
        menu.style.cssText = `
          position: fixed;
          left: ${e.pageX}px;
          top: ${e.pageY}px;
          background: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          padding: 8px 0;
          z-index: 10000;
          min-width: 180px;
        `;

        const openItem = document.createElement("div");
        openItem.textContent = "在新分頁開啟圖片";
        openItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          transition: background 0.2s;
        `;
        openItem.onmouseover = () => (openItem.style.background = "#f0f0f0");
        openItem.onmouseout = () => (openItem.style.background = "transparent");
        openItem.onclick = () => {
          window.open(imageSrc, "_blank");
          menu.remove();
        };

        const copyItem = document.createElement("div");
        copyItem.textContent = "複製圖片連結";
        copyItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          transition: background 0.2s;
        `;
        copyItem.onmouseover = () => (copyItem.style.background = "#f0f0f0");
        copyItem.onmouseout = () => (copyItem.style.background = "transparent");
        copyItem.onclick = () => {
          navigator.clipboard.writeText(imageSrc);
          alert("圖片連結已複製到剪貼簿");
          menu.remove();
        };

        menu.appendChild(openItem);
        menu.appendChild(copyItem);
        document.body.appendChild(menu);

        const closeMenu = (ev: MouseEvent) => {
          if (!menu.contains(ev.target as Node)) {
            menu.remove();
            document.removeEventListener("click", closeMenu);
          }
        };
        setTimeout(() => {
          document.addEventListener("click", closeMenu);
        }, 0);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [imageSrc]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapping) return;
    if (passwordInput === (mapping.password || "")) {
      setPasswordRequired(false);
      setError(null);
    } else {
      setError("密碼錯誤");
    }
  };

  return (
    <div className={styles.container}>
      {passwordRequired ? (
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
      ) : (
        <div className={styles.imageContainer}>
          <div className={styles.header}>
            <h1>
              <img
                src="/logo-imgup.png"
                alt="duk.tw Logo"
                style={{ display: "inline", height: "1.2em", marginRight: "0.3em" }}
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
              ref={imageRef}
              src={imageSrc}
              alt={mapping.filename}
              className={styles.image}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.dataset.failedOnce) {
                  img.dataset.failedOnce = "true";
                  // 使用透明占位圖，避免任何情況下落回真實來源 URL
                  img.src =
                    "data:image/svg+xml;charset=utf-8," +
                    encodeURIComponent(
                      "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='100%' height='100%' fill='transparent'/></svg>"
                    );
                }
                setError("圖片載入失敗");
              }}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>

          <div className={styles.actions}>
            <button
              onClick={() => window.open(shortUrlWithExt, "_blank")}
              className={styles.actionBtn}
            >
              在新視窗開啟
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shortUrlWithExt);
                alert("已複製");
              }}
              className={styles.actionBtn}
            >
              複製短網址
            </button>
            <a href="/" className={styles.backLink}>
              回到首頁
            </a>
          </div>

          {error && (
            <div className={styles.error} style={{ marginTop: 16 }}>
              <p>{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}