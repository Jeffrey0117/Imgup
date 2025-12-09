"use client";

import { useState, useEffect } from "react";
import styles from "./UploadLimits.module.css";

interface UserLimits {
  tier: "guest" | "member" | "premium";
  maxFileSize: number;
  uploadsPerMinute: number;
  uploadsPerDay: number;
  remainingToday?: number;
}

const TIER_LIMITS: Record<string, UserLimits> = {
  guest: {
    tier: "guest",
    maxFileSize: 10 * 1024 * 1024, // 10MB
    uploadsPerMinute: 5,
    uploadsPerDay: 50,
  },
  member: {
    tier: "member",
    maxFileSize: 25 * 1024 * 1024, // 25MB
    uploadsPerMinute: 20,
    uploadsPerDay: 200,
  },
  premium: {
    tier: "premium",
    maxFileSize: 50 * 1024 * 1024, // 50MB
    uploadsPerMinute: 60,
    uploadsPerDay: Infinity,
  },
};

const TIER_NAMES: Record<string, string> = {
  guest: "訪客",
  member: "免費會員",
  premium: "付費會員",
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }
  return `${Math.round(bytes / 1024)}KB`;
}

interface UploadLimitsProps {
  userTier?: "guest" | "member" | "premium";
  showDetails?: boolean;
  onFileTooLarge?: (file: File, maxSize: number) => void;
}

export default function UploadLimits({
  userTier = "guest",
  showDetails = false,
  onFileTooLarge
}: UploadLimitsProps) {
  const [limits, setLimits] = useState<UserLimits>(TIER_LIMITS[userTier]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setLimits(TIER_LIMITS[userTier] || TIER_LIMITS.guest);
  }, [userTier]);

  const tierName = TIER_NAMES[userTier] || "訪客";

  return (
    <div className={styles.container}>
      <button
        className={styles.toggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.icon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
        <span className={styles.label}>
          {tierName} - 單檔 {formatFileSize(limits.maxFileSize)}，
          {limits.uploadsPerMinute}張/分鐘
        </span>
        <span className={`${styles.arrow} ${isExpanded ? styles.arrowUp : ""}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {isExpanded && (
        <div className={styles.details}>
          <div className={styles.limitRow}>
            <span className={styles.limitLabel}>身份</span>
            <span className={styles.limitValue}>{tierName}</span>
          </div>
          <div className={styles.limitRow}>
            <span className={styles.limitLabel}>單檔上限</span>
            <span className={styles.limitValue}>{formatFileSize(limits.maxFileSize)}</span>
          </div>
          <div className={styles.limitRow}>
            <span className={styles.limitLabel}>每分鐘上限</span>
            <span className={styles.limitValue}>{limits.uploadsPerMinute} 張</span>
          </div>
          <div className={styles.limitRow}>
            <span className={styles.limitLabel}>每日上限</span>
            <span className={styles.limitValue}>
              {limits.uploadsPerDay === Infinity ? "無限制" : `${limits.uploadsPerDay} 張`}
            </span>
          </div>

          {userTier === "guest" && (
            <div className={styles.upgrade}>
              <a href="/register" className={styles.upgradeLink}>
                註冊免費會員享更高限制
              </a>
            </div>
          )}

          {userTier === "member" && (
            <div className={styles.upgrade}>
              <a href="/membership" className={styles.upgradeLink}>
                升級付費會員享無限上傳
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 驗證檔案大小的 helper function
export function validateFileSize(
  file: File,
  userTier: "guest" | "member" | "premium" = "guest"
): { valid: boolean; error?: string; maxSize: number } {
  const limits = TIER_LIMITS[userTier] || TIER_LIMITS.guest;

  if (file.size > limits.maxFileSize) {
    return {
      valid: false,
      error: `檔案過大！${TIER_NAMES[userTier]}上限為 ${formatFileSize(limits.maxFileSize)}，您的檔案為 ${formatFileSize(file.size)}`,
      maxSize: limits.maxFileSize,
    };
  }

  return { valid: true, maxSize: limits.maxFileSize };
}

// 導出限制常數供其他地方使用
export { TIER_LIMITS, TIER_NAMES, formatFileSize };
