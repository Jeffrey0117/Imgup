"use client";

import { useState, useEffect, useRef } from "react";
import { notFound } from "next/navigation";
import { isValidHash } from "../../../utils/hash";
import styles from "../page.module.css";

interface Mapping {
  hash: string;
  url: string;
  filename: string;
  fileExtension?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  password?: string | null;
  shortUrl: string;
}

interface Props {
  params: { hash: string };
}

export default function PreviewPage({ params }: Props) {
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);

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
              alt="duk.tw Logo"
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

  // 產生代理圖片 URL (隱藏真實地址)
  const getProxyImageUrl = () => {
    const extension = mapping?.fileExtension || "";
    // 檢查是否在客戶端環境
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/${params.hash}${extension}`;
    }
    // 在 SSR 階段返回相對路徑
    return `/${params.hash}${extension}`;
  };

  // 自訂右鍵選單處理
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // 只在圖片元素上攔截右鍵
      if (imageRef.current && imageRef.current.contains(e.target as Node)) {
        e.preventDefault();
        
        // 創建自訂選單
        const existingMenu = document.getElementById("custom-context-menu");
        if (existingMenu) {
          existingMenu.remove();
        }

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

        const proxyUrl = getProxyImageUrl();

        // 在新分頁開啟
        const openItem = document.createElement("div");
        openItem.textContent = "在新分頁開啟圖片";
        openItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          transition: background 0.2s;
        `;
        openItem.onmouseover = () => {
          openItem.style.background = "#f0f0f0";
        };
        openItem.onmouseout = () => {
          openItem.style.background = "transparent";
        };
        openItem.onclick = () => {
          window.open(proxyUrl, "_blank");
          menu.remove();
        };

        // 複製圖片連結
        const copyItem = document.createElement("div");
        copyItem.textContent = "複製圖片連結";
        copyItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          transition: background 0.2s;
        `;
        copyItem.onmouseover = () => {
          copyItem.style.background = "#f0f0f0";
        };
        copyItem.onmouseout = () => {
          copyItem.style.background = "transparent";
        };
        copyItem.onclick = () => {
          navigator.clipboard.writeText(proxyUrl);
          alert("圖片連結已複製到剪貼簿");
          menu.remove();
        };

        menu.appendChild(openItem);
        menu.appendChild(copyItem);
        document.body.appendChild(menu);

        // 點擊其他地方時關閉選單
        const closeMenu = (e: MouseEvent) => {
          if (!menu.contains(e.target as Node)) {
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
  }, [mapping, params.hash]);

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        <div className={styles.header}>
          <h1>
            <img
              src="/logo-imgup.png"
              alt="duk.tw Logo"
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
            ref={imageRef}
            src={getProxyImageUrl()}
            alt={mapping.filename}
            className={styles.image}
            onError={(e) => {
              // 如果代理失敗，降級到原始 URL (但不顯示給使用者)
              const img = e.currentTarget as HTMLImageElement;
              if (!img.dataset.fallback) {
                img.dataset.fallback = "true";
                img.src = mapping.url;
              } else {
                setError("圖片載入失敗");
              }
            }}
            onDragStart={(e) => {
              // 防止拖曳時暴露真實 URL
              e.preventDefault();
            }}
          />
        </div>

        <div className={styles.actions}>
          <button
            onClick={() => {
              const proxyUrl = getProxyImageUrl();
              window.open(proxyUrl, "_blank");
            }}
            className={styles.actionBtn}
          >
            在新視窗開啟
          </button>
          <button
            onClick={() => {
              const extension = mapping.fileExtension || "";
              const shortUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/${params.hash}${extension}`
                : `/${params.hash}${extension}`;
              navigator.clipboard.writeText(shortUrl);
              alert("短網址已複製到剪貼簿");
            }}
            className={styles.actionBtn}
          >
            複製短網址
          </button>
          <a href="/" className={styles.backLink}>
            回到首頁
          </a>
        </div>
      </div>
    </div>
  );
}
