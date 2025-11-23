"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./layout.module.css";
import { ToastProvider } from "@/contexts/ToastContext";

interface AdminData {
  id: string;
  email: string;
  username: string;
  role: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    checkAuth();
    // 從 localStorage 載入側邊欄狀態
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setIsSidebarCollapsed(saved === 'true');
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/auth/verify", {
        credentials: "include",
      });
      if (!response.ok) {
        router.push("/admin-new/login");
        return;
      }
      const data = await response.json();
      setAdminData(data.admin);
    } catch (error) {
      console.error("身份驗證失敗:", error);
      router.push("/admin-new/login");
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/admin-new/login");
    } catch (error) {
      console.error("登出失敗:", error);
    }
  };

  if (loading) {
    return (
      <ToastProvider>
        <div className={styles.loadingScreen}>
          <div className={styles.loader}>載入中...</div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className={styles.layout}>
        {/* Dark Sidebar */}
        <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Image
                src="/logo-imgup.png"
                alt="duk.tw Logo"
                width={36}
                height={36}
                priority
              />
            </div>
            <div className={styles.logoText}>
              <div className={styles.brandName}>duk.tw</div>
              <div className={styles.brandSub}>Admin Panel</div>
            </div>
          </div>

          <nav className={styles.nav}>
            <Link
              href="/admin-new"
              className={`${styles.navItem} ${pathname === "/admin-new" ? styles.active : ""}`}
            >
              <span className={styles.navIcon}>📊</span>
              <span className={styles.navText}>Dashboard</span>
            </Link>
            <Link
              href="/admin-new/users"
              className={`${styles.navItem} ${pathname.startsWith("/admin-new/users") ? styles.active : ""}`}
            >
              <span className={styles.navIcon}>👥</span>
              <span className={styles.navText}>用戶管理</span>
            </Link>
            <Link
              href="/admin-new/images"
              className={`${styles.navItem} ${pathname.startsWith("/admin-new/images") ? styles.active : ""}`}
            >
              <span className={styles.navIcon}>🖼️</span>
              <span className={styles.navText}>圖片管理</span>
            </Link>
            <Link
              href="/admin-new/albums"
              className={`${styles.navItem} ${pathname.startsWith("/admin-new/albums") ? styles.active : ""}`}
            >
              <span className={styles.navIcon}>📁</span>
              <span className={styles.navText}>相簿管理</span>
            </Link>
            <Link
              href="/admin-new/analytics"
              className={`${styles.navItem} ${pathname.startsWith("/admin-new/analytics") ? styles.active : ""}`}
            >
              <span className={styles.navIcon}>📈</span>
              <span className={styles.navText}>數據分析</span>
            </Link>
            <Link
              href="/admin-new/security"
              className={`${styles.navItem} ${pathname.startsWith("/admin-new/security") ? styles.active : ""}`}
            >
              <span className={styles.navIcon}>🔐</span>
              <span className={styles.navText}>安全管理</span>
            </Link>
          </nav>

          <div className={styles.sidebarFooter}>
            <div className={styles.adminInfo}>
              <div className={styles.adminAvatar}>
                {adminData?.username?.[0]?.toUpperCase() || "A"}
              </div>
              <div className={styles.adminDetails}>
                <div className={styles.adminName}>
                  {adminData?.username || "Admin"}
                </div>
                <div className={styles.adminRole}>管理員</div>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className={styles.toggleButton}
              aria-label={isSidebarCollapsed ? "展開側邊欄" : "收起側邊欄"}
              aria-expanded={!isSidebarCollapsed}
            >
              {isSidebarCollapsed ? "▶" : "◀"}
            </button>
            <button onClick={handleLogout} className={styles.logoutButton}>
              {isSidebarCollapsed ? "➡️" : "登出"}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`${styles.main} ${isSidebarCollapsed ? styles.expanded : ''}`}>{children}</main>
      </div>
    </ToastProvider>
  );
}
