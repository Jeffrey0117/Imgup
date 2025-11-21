"use client";

import { useState } from "react";
import styles from "./GlassmorphismLayout.module.css";
import { mockStats, mockImages, mockUsers } from "../mockData";

export default function GlassmorphismLayout() {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div className={styles.layout}>
      {/* Animated Background */}
      <div className={styles.background}>
        <div className={styles.gradientOrb} style={{ top: "10%", left: "20%" }}></div>
        <div className={styles.gradientOrb} style={{ top: "60%", right: "15%" }}></div>
        <div className={styles.gradientOrb} style={{ bottom: "10%", left: "50%" }}></div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Top Bar */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>✨</span>
            <span className={styles.logoText}>duk.tw</span>
          </div>
          <nav className={styles.nav}>
            <a href="#" className={`${styles.navLink} ${styles.active}`}>Dashboard</a>
            <a href="#" className={styles.navLink}>用戶</a>
            <a href="#" className={styles.navLink}>圖片</a>
            <a href="#" className={styles.navLink}>統計</a>
          </nav>
          <div className={styles.userMenu}>
            <span className={styles.userAvatar}>A</span>
          </div>
        </header>

        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Admin Dashboard</h1>
          <p className={styles.heroSubtitle}>管理你的圖片服務</p>
        </section>

        {/* Stats - Glassmorphism Cards */}
        <section className={styles.statsGrid}>
          <div className={styles.glassCard}>
            <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              👥
            </div>
            <div className={styles.cardLabel}>總用戶</div>
            <div className={styles.cardValue}>{mockStats.totalUsers.toLocaleString()}</div>
            <div className={styles.cardChange}>+{mockStats.todayUsers} 今日</div>
          </div>

          <div className={styles.glassCard}>
            <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}>
              🖼️
            </div>
            <div className={styles.cardLabel}>總圖片</div>
            <div className={styles.cardValue}>{mockStats.totalImages.toLocaleString()}</div>
            <div className={styles.cardChange}>+12% 本週</div>
          </div>

          <div className={styles.glassCard}>
            <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}>
              👁️
            </div>
            <div className={styles.cardLabel}>總瀏覽</div>
            <div className={styles.cardValue}>{(mockStats.totalViews / 1000000).toFixed(1)}M</div>
            <div className={styles.cardChange}>+{mockStats.growthRate}%</div>
          </div>

          <div className={styles.glassCard}>
            <div className={styles.cardIcon} style={{ background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }}>
              ⚡
            </div>
            <div className={styles.cardLabel}>活躍</div>
            <div className={styles.cardValue}>{mockStats.activeUsers.toLocaleString()}</div>
            <div className={styles.cardChange}>本月</div>
          </div>
        </section>

        {/* Featured Image - Large Glass Card */}
        <section className={styles.featuredSection}>
          <div className={styles.glassPanel}>
            <h2 className={styles.sectionTitle}>🔥 精選圖片</h2>
            <div className={styles.featuredImage}>
              <img
                src={mockImages[selectedImage].url}
                alt={mockImages[selectedImage].filename}
              />
              <div className={styles.featuredOverlay}>
                <div className={styles.featuredInfo}>
                  <h3>{mockImages[selectedImage].filename}</h3>
                  <div className={styles.featuredMeta}>
                    <span>👁️ {mockImages[selectedImage].views.toLocaleString()}</span>
                    <span>👤 {mockImages[selectedImage].uploader}</span>
                    <span>📅 {mockImages[selectedImage].uploadDate}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.thumbnailBar}>
              {mockImages.slice(0, 6).map((img, index) => (
                <div
                  key={img.id}
                  className={`${styles.thumbnail} ${index === selectedImage ? styles.active : ""}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={img.url} alt={img.filename} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Users and Gallery Grid */}
        <section className={styles.gridSection}>
          <div className={styles.glassPanel}>
            <h3 className={styles.panelTitle}>👥 Top 用戶</h3>
            <div className={styles.userList}>
              {mockUsers.slice(0, 5).map((user, index) => (
                <div key={user.id} className={styles.userItem}>
                  <div className={styles.rankBadge}>#{index + 1}</div>
                  <div className={styles.userAvatarCircle}>{user.username[0].toUpperCase()}</div>
                  <div className={styles.userDetails}>
                    <div className={styles.userName}>{user.username}</div>
                    <div className={styles.userStats}>{user.uploads} 張 · {user.totalViews.toLocaleString()} 次</div>
                  </div>
                  <div className={styles.tierBadge}>{user.tier}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.glassPanel}>
            <h3 className={styles.panelTitle}>📸 最新圖片</h3>
            <div className={styles.imageGallery}>
              {mockImages.slice(0, 6).map((image) => (
                <div key={image.id} className={styles.galleryItem}>
                  <img src={image.url} alt={image.filename} />
                  <div className={styles.galleryItemOverlay}>
                    <div className={styles.galleryItemInfo}>
                      <div className={styles.galleryItemTitle}>{image.filename}</div>
                      <div className={styles.galleryItemViews}>👁️ {image.views.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
