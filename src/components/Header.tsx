"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';
import UserStatus from './UserStatus';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // 防止 body 在選單開啟時滾動
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // 在 admin-new 路径下隐藏 Header
  if (pathname?.startsWith('/admin-new')) {
    return null;
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          {/* Logo Section */}
          <div className={styles.logoSection}>
            <Link href="/" className={styles.logoLink} onClick={closeMenu}>
              <div className={styles.logoContainer}>
                <Image
                  src="/new_logo_with_text3_resize.png"
                  alt="duk.tw Logo"
                  className={styles.logo}
                  width={497}
                  height={191}
                  priority
                />
              </div>
              <span className={styles.siteName}>圖鴨上床</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className={styles.desktopNav}>
            <Link href="/" className={styles.navLink}>首頁</Link>
            <Link href="/features" className={styles.navLink}>功能特色</Link>
            <Link href="/use-cases" className={styles.navLink}>應用案例</Link>
            <Link href="/about" className={styles.navLink}>關於我們</Link>
            <Link href="/guide" className={styles.navLink}>使用指南</Link>
          </nav>

          {/* Desktop User Area */}
          <div className={styles.userArea}>
            <UserStatus />
          </div>

          {/* Mobile Menu Button - 增強的漢堡選單 */}
          <button
            className={`${styles.mobileMenuButton} ${isMenuOpen ? styles.open : ''}`}
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "關閉選單" : "開啟選單"}
            aria-expanded={isMenuOpen}
          >
            <span className={styles.hamburgerBox}>
              <span className={styles.hamburgerInner}></span>
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer - 移到 header 外部以避免 z-index 問題 */}
      <div className={`${styles.mobileDrawer} ${isMenuOpen ? styles.open : ''}`}>
        <nav className={styles.mobileNav}>
          <Link href="/" className={styles.mobileNavLink} onClick={closeMenu}>
            <span className={styles.navIcon}>🏠</span>
            首頁
          </Link>
          <Link href="/features" className={styles.mobileNavLink} onClick={closeMenu}>
            <span className={styles.navIcon}>✨</span>
            功能特色
          </Link>
          <Link href="/use-cases" className={styles.mobileNavLink} onClick={closeMenu}>
            <span className={styles.navIcon}>💡</span>
            應用案例
          </Link>
          <Link href="/about" className={styles.mobileNavLink} onClick={closeMenu}>
            <span className={styles.navIcon}>ℹ️</span>
            關於我們
          </Link>
          <Link href="/guide" className={styles.mobileNavLink} onClick={closeMenu}>
            <span className={styles.navIcon}>📖</span>
            使用指南
          </Link>

          <div className={styles.mobileUser}>
            <UserStatus />
          </div>
        </nav>
      </div>

      {/* Mobile Menu Overlay - 增強的遮罩層 */}
      <div
        className={`${styles.overlay} ${isMenuOpen ? styles.open : ''}`}
        onClick={closeMenu}
        aria-hidden={!isMenuOpen}
      />
    </>
  );
}