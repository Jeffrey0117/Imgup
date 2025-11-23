"use client";

import { useState } from "react";
import styles from "./PasswordForm.module.css";

interface PasswordFormProps {
  onSubmit: (password: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export default function PasswordForm({ onSubmit, loading = false, error }: PasswordFormProps) {
  const [passwordInput, setPasswordInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || loading) return;

    setIsSubmitting(true);
    try {
      await onSubmit(passwordInput);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.passwordForm}>
      <h2>🔒 需要密碼</h2>
      <p>這張圖片受到密碼保護</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          placeholder="請輸入 4 位數密碼"
          pattern="[0-9]{4}"
          maxLength={4}
          className={styles.passwordInput}
          required
          disabled={isSubmitting || loading}
        />
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting || loading}
        >
          {isSubmitting || loading ? "驗證中..." : "確認"}
        </button>
      </form>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}