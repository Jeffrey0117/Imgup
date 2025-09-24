"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import styles from './Header.module.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <Link href="/" className={styles.logoLink} onClick={closeMenu}>
            <Image
              src="/logo-imgup.png"
              alt="duk.tw Logo"
              className={styles.logo}
              width={40}
              height={40}
              priority
            />
            <span className={styles.siteName}>圖鴨上床</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className={styles.desktopNav}>
          <Link href="/" className={styles.navLink}>首頁</Link>
          <Link href="/features" className={styles.navLink}>功能特色</Link>
          <Link href="/guide" className={styles.navLink}>使用指南</Link>
          <Link href="/use-cases" className={styles.navLink}>應用案例</Link>
          <Link href="/about" className={styles.navLink}>關於我們</Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className={styles.mobileMenuButton}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className={styles.hamburger}></span>
        </button>

        {/* Mobile Navigation */}
        <nav className={`${styles.mobileNav} ${isMenuOpen ? styles.open : ''}`}>
          <Link href="/" className={styles.mobileNavLink} onClick={closeMenu}>首頁</Link>
          <Link href="/features" className={styles.mobileNavLink} onClick={closeMenu}>功能特色</Link>
          <Link href="/guide" className={styles.mobileNavLink} onClick={closeMenu}>使用指南</Link>
          <Link href="/use-cases" className={styles.mobileNavLink} onClick={closeMenu}>應用案例</Link>
          <Link href="/about" className={styles.mobileNavLink} onClick={closeMenu}>關於我們</Link>
        </nav>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && <div className={styles.overlay} onClick={closeMenu}></div>}
      </div>
    </header>
  );
}