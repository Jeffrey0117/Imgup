"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { isValidHash } from "../../../utils/hash";
import styles from "../page.module.css";
import type { Mapping as ClientMapping } from "./PreviewClient";

// 僅在瀏覽器載入，避免任何 SSR/水合不一致
const PreviewClient = dynamic(() => import("./PreviewClient"), { ssr: false });

interface Props {
  params: { hash: string };
}

async function fetchMappingMultiBase(hash: string): Promise<ClientMapping | null> {
  const bases: string[] = [];
  if (process.env.NEXT_PUBLIC_BASE_URL) bases.push(process.env.NEXT_PUBLIC_BASE_URL);
  if (process.env.VERCEL_URL) bases.push(`https://${process.env.VERCEL_URL}`);
  bases.push("https://duk.tw");
  bases.push("http://localhost:3000");

  const headers: HeadersInit = { Accept: "application/json" };

  for (const base of Array.from(new Set(bases))) {
    try {
      const url = `${base.replace(/\/$/, "")}/api/mapping/${hash}`;
      const res = await fetch(url, { cache: "no-store", headers });
      if (!res.ok) continue;
      const data = await res.json();
      // 正規化欄位，確保類型穩定
      const normalized: ClientMapping = {
        hash: data.hash,
        url: data.url,
        filename: data.filename,
        shortUrl: data.shortUrl,
        createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date(data.createdAt).toISOString(),
        expiresAt: data.expiresAt ? (typeof data.expiresAt === "string" ? data.expiresAt : new Date(data.expiresAt).toISOString()) : null,
        hasPassword: data.hasPassword ?? !!data.password, // 相容新舊格式
        fileExtension: data.fileExtension ?? null,
      };
      return normalized;
    } catch {
      // 換下一個 base
    }
  }
  return null;
}

export default function PreviewPage({ params }: Props) {
  const { hash } = params;

  const [mapping, setMapping] = useState<ClientMapping | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isHashValid = useMemo(() => isValidHash(hash), [hash]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!isHashValid) {
        if (mounted) {
          setError("無效的連結格式");
          setLoading(false);
        }
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const isExpired = urlParams.get('expired') === 'true';
      
      if (isExpired) {
        if (mounted) {
          setError("這個連結已經過期了");
          setMapping(null);
          setLoading(false);
        }
        return;
      }

      const result = await fetchMappingMultiBase(hash);
      if (!mounted) return;

      if (!result) {
        setError("找不到資源，或暫時無法取得資料");
        setLoading(false);
        return;
      }

      if (result.expiresAt && new Date(result.expiresAt) < new Date()) {
        setError("這個連結已經過期了");
        setMapping(null);
        setLoading(false);
        return;
      }

      setMapping(result);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [hash, isHashValid]);

  // 統一的載入畫面（與 SSR 無關，避免 #310）
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>載入中...</div>
      </div>
    );
  }

  if (!mapping) {
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
          <p className={styles.errorMessage}>
            {error || "找不到這個連結"}
          </p>
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

  return (
    <>
      {error && (
        <div className={styles.container}>
          <div className={styles.error}>
            <p className={styles.errorText}>{error}</p>
          </div>
        </div>
      )}
      <PreviewClient mapping={mapping} hash={hash} />
    </>
  );
}
