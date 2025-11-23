"use client";

import Toast, { ToastProps } from "./Toast";
import styles from "./ToastContainer.module.css";

interface ToastContainerProps {
  toasts: Omit<ToastProps, "onClose">[];
  onClose: (id: string) => void;
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}
