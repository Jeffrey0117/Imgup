"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PasswordForm from "@/components/PasswordForm";
import ImageContextMenu, { ContextMenuAction } from "@/components/ImageContextMenu";
import ImageViewer from "@/components/ImageViewer";
import styles from "../page.module.css";

export interface Mapping {
  hash: string;
  url: string;
  filename: string;
  fileExtension?: string | null;
  createdAt: string; // ISO string from server
  expiresAt?: string | null;
  hasPassword?: boolean;
  password?: string | null; // 支援舊格式
  shortUrl: string;
}

interface PreviewClientProps {
  mapping: Mapping;
  hash: string;
}

export default function PreviewClient({ mapping, hash }: PreviewClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    position: { x: number; y: number };
  }>({ show: false, position: { x: 0, y: 0 } });

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

  // 預覽頁面使用 Worker 代理 URL，隱藏來源
  const imageUrl = useMemo(() => {
    const proxyBaseUrl = process.env.NEXT_PUBLIC_PROXY_URL || 'https://i.duk.tw';
    return `${proxyBaseUrl}/${hash}${normalizedExt}`;
  }, [hash, normalizedExt]);

  // 檢查是否需要密碼
  useEffect(() => {
    const checkPasswordStatus = async () => {
      try {
        const needsPassword = !!mapping.hasPassword;

        const cookieAuth = document.cookie
          .split('; ')
          .find(row => row.startsWith(`auth_${hash}=`));

        if (cookieAuth) {
          setIsPasswordVerified(true);
          setPasswordRequired(false);
        } else if (needsPassword) {
          setPasswordRequired(true);
          setIsPasswordVerified(false);
        } else {
          setPasswordRequired(false);
          setIsPasswordVerified(true);
        }
      } catch (error) {
        console.error("檢查密碼狀態錯誤:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkPasswordStatus();
  }, [hash, mapping.hasPassword]);

  // 處理右鍵選單
  const handleContextMenu = (e: React.MouseEvent) => {
    if (imageRef.current && imageRef.current.contains(e.target as Node)) {
      e.preventDefault();
      setContextMenu({
        show: true,
        position: { x: e.pageX, y: e.pageY },
      });
    }
  };

  const contextMenuActions: ContextMenuAction[] = [
    {
      label: "在新分頁開啟圖片",
      onClick: () => window.open(imageUrl, "_blank"),
    },
    {
      label: "複製圖片連結",
      onClick: () => {
        navigator.clipboard.writeText(imageUrl);
        alert("圖片連結已複製到剪貼簿");
      },
    },
  ];

  const handlePasswordSubmit = async (password: string) => {
    setError(null);
    try {
      const response = await fetch("/api/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hash,
          password,
        }),
      });

      if (response.ok) {
        setPasswordRequired(false);
        setIsPasswordVerified(true);
        setError(null);
      } else {
        const data = await response.json();
        throw new Error(data.error || "密碼錯誤");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "驗證失敗，請稍後再試";
      setError(message);
      throw err; // Re-throw to let PasswordForm handle loading state
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} onContextMenu={handleContextMenu}>
      {passwordRequired && !isPasswordVerified ? (
        <PasswordForm
          onSubmit={handlePasswordSubmit}
          error={error}
        />
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
            <ImageViewer
              ref={imageRef}
              src={imageUrl}
              alt={mapping.filename}
              fallbackSrc={shortUrlNoExt}
              onError={setError}
              className={styles.image}
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

      <ImageContextMenu
        show={contextMenu.show}
        position={contextMenu.position}
        onClose={() => setContextMenu({ show: false, position: { x: 0, y: 0 } })}
        actions={contextMenuActions}
      />
    </div>
  );
}