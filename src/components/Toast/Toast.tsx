"use client";

import { useEffect } from "react";
import styles from "./Toast.module.css";

export interface ToastProps {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({
  id,
  message,
  type,
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "ℹ";
    }
  };

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.icon}>{getIcon()}</div>
      <div className={styles.message}>{message}</div>
      <button className={styles.closeButton} onClick={() => onClose(id)}>
        ✕
      </button>
    </div>
  );
}
