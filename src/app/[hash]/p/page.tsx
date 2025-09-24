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
        password: data.password ?? null,
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

      const result = await fetchMappingMultiBase(hash);
      if (!mounted) return;

      if (!result) {
        setError("找不到資源，或暫時無法取得資料");
        setLoading(false);
        return;
      }

      // 過期檢查（在前端做降級提示，不中斷渲染）
      if (result.expiresAt && new Date(result.expiresAt) < new Date()) {
        setError("連結已過期");
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

  // 友善錯誤畫面（不使用 notFound/redirect 以避免 SSR 介入）
  if (!mapping) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>
            <img
              src="/logo-imgup.png"
              alt="duk.tw Logo"
              style={{ display: "inline", height: "1.2em", marginRight: "0.3em" }}
            />
            哎呀！
          </h2>
        </div>
        <p className={styles.errorText}>{error || "無法顯示此頁面"}</p>
        <a href="/" className={styles.backLink}>
          回到首頁
        </a>
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