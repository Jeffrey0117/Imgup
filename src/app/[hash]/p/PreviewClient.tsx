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
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // 規範化副檔名：優先 fileExtension，否則 fallback filename -> url 推導；白名單過濾
  const normalizedExt = useMemo(() => {
    const ALLOWED = new Set([
      ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
      ".bmp", ".ico", ".tif", ".tiff", ".avif", ".heic", ".heif"
    ]);

    const normalize = (ext: string | null | undefined) => {
      const raw = (ext || "").toString().trim();
      if (!raw) return "";
      const withDot = raw.startsWith(".") ? raw : `.${raw}`;
      const lower = withDot.toLowerCase();
      return ALLOWED.has(lower) ? lower : "";
    };

    const extractFromFilename = (name: string | null | undefined) => {
      const n = (name || "").toString().trim();
      if (!n) return "";
      const m = n.match(/\.([a-zA-Z0-9]+)$/);
      return normalize(m ? m[1] : "");
    };

    const extractFromUrl = (url: string | null | undefined) => {
      const u = (url || "").toString().trim();
      if (!u) return "";
      try {
        const parsed = new URL(u);
        const pathname = parsed.pathname || "";
        const basename = pathname.split("/").pop() || "";
        const m = basename.match(/\.([a-zA-Z0-9]+)$/);
        return normalize(m ? m[1] : "");
      } catch {
        // 若不是絕對 URL，嘗試當作路徑處理
        const pathname = u.split("?")[0].split("#")[0];
        const basename = pathname.split("/").pop() || "";
        const m = basename.match(/\.([a-zA-Z0-9]+)$/);
        return normalize(m ? m[1] : "");
      }
    };

    // 1) 直接用 fileExtension
    const byExplicit = normalize(mapping?.fileExtension);
    if (byExplicit) return byExplicit;

    // 2) 從 filename 推導
    const byFilename = extractFromFilename(mapping?.filename);
    if (byFilename) return byFilename;

    // 3) 從原始 url 推導
    const byUrl = extractFromUrl(mapping?.url);
    if (byUrl) return byUrl;

    // 無法推導則不附加
    return "";
  }, [mapping?.fileExtension, mapping?.filename, mapping?.url]);

  const shortUrlWithExt = useMemo(() => {
    try {
      const origin = window.location.origin;
      return `${origin}/${hash}${normalizedExt}`;
    } catch {
      return `/${hash}${normalizedExt}`;
    }
  }, [hash, normalizedExt]);

  const shortUrlNoExt = useMemo(() => {
    try {
      const origin = window.location.origin;
      return `${origin}/${hash}`;
    } catch {
      return `/${hash}`;
    }
  }, [hash]);

  const imageUrl = useMemo(() => shortUrlWithExt, [shortUrlWithExt]);

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
          window.open(imageUrl, "_blank");
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
          navigator.clipboard.writeText(imageUrl);
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
  }, [imageUrl, shortUrlWithExt]);

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

          <div className={styles.imageWrapper} style={{ position: "relative" }}>
            <img
              ref={imageRef}
              src={imageUrl}
              alt={mapping.filename}
              className={styles.image}
              style={{
                opacity: imageLoaded ? 1 : 0,
                transition: "opacity 150ms ease-in",
              }}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.dataset.triedNoExt) {
                  img.dataset.triedNoExt = "true";
                  img.src = shortUrlNoExt;
                  setImageLoaded(false);
                  return;
                }
                if (!img.dataset.failedOnce) {
                  img.dataset.failedOnce = "true";
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
            {!imageLoaded && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f3f4f6",
                  borderRadius: 8,
                  color: "#9ca3af",
                  fontSize: 14,
                }}
              >
                圖片載入中…
              </div>
            )}
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