"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import ToastContainer from "@/components/Toast/ToastContainer";
import { ToastProps } from "@/components/Toast/Toast";

interface ToastContextType {
  showToast: (message: string, type?: ToastProps["type"], duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Omit<ToastProps, "onClose">[]>([]);
  const [mounted, setMounted] = useState(false);

  // 確保 Portal 只在 client 端 render
  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastProps["type"] = "info", duration = 3000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Omit<ToastProps, "onClose"> = {
        id,
        message,
        type,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const success = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "success", duration);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "error", duration);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "warning", duration);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "info", duration);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* 使用 Portal 將 Toast 渲染到 body，確保 z-index 不受父元素限制 */}
      {mounted && createPortal(
        <ToastContainer toasts={toasts} onClose={removeToast} />,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
