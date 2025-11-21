"use client";

import { useState } from "react";
import styles from "./LightFullWidthLayout.module.css";
import { mockStats, mockImages, mockUsers, mockActivities } from "../mockData";

export default function LightFullWidthLayout() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className={styles.layout}>
      {/* Top Navigation */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>✨</div>
            <span className={styles.logoText}>duk.tw Admin</span>
          </div>

          <nav className={styles.nav}>
            <button
              className={`${styles.navTab} ${activeTab === "dashboard" ? styles.active : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              📊 Dashboard
            </button>
            <button
              className={`${styles.navTab} ${activeTab === "users" ? styles.active : ""}`}
              onClick={() => setActiveTab("users")}
            >
              👥 用戶
            </button>
            <button
              className={`${styles.navTab} ${activeTab === "images" ? styles.active : ""}`}
              onClick={() => setActiveTab("images")}
            >
              🖼️ 圖片
            </button>
            <button
              className={`${styles.navTab} ${activeTab === "stats" ? styles.active : ""}`}
              onClick={() => setActiveTab("stats")}
            >
              📈 統計
            </button>
          </nav>

          <div className={styles.headerActions}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="搜尋..."
                className={styles.searchInput}
              />
            </div>
            <button className={styles.profileButton}>
              <span className={styles.profileAvatar}>A</span>
              <span className={styles.profileName}>Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Hero Section */}
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>歡迎回來，管理員 👋</h1>
              <p className={styles.heroSubtitle}>
                今天有 {mockStats.todayUsers} 位新用戶加入，系統運行正常
              </p>
            </div>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton}>📊 查看報告</button>
              <button className={styles.secondaryButton}>⚙️ 系統設定</button>
            </div>
          </section>

          {/* Stats Cards - Colorful */}
          <section className={styles.statsSection}>
            <div className={styles.statCardLarge} style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              <div className={styles.statCardContent}>
                <div className={styles.statCardLabel}>總用戶數</div>
                <div className={styles.statCardValue}>
                  {mockStats.totalUsers.toLocaleString()}
                </div>
                <div className={styles.statCardChange}>↗ +{mockStats.todayUsers} 今日新增</div>
              </div>
              <div className={styles.statCardIcon}>👥</div>
            </div>

            <div className={styles.statCardLarge} style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}>
              <div className={styles.statCardContent}>
                <div className={styles.statCardLabel}>總圖片數</div>
                <div className={styles.statCardValue}>
                  {mockStats.totalImages.toLocaleString()}
                </div>
                <div className={styles.statCardChange}>↗ +12% 本週</div>
              </div>
              <div className={styles.statCardIcon}>🖼️</div>
            </div>

            <div className={styles.statCardLarge} style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}>
              <div className={styles.statCardContent}>
                <div className={styles.statCardLabel}>總瀏覽數</div>
                <div className={styles.statCardValue}>
                  {(mockStats.totalViews / 1000000).toFixed(1)}M
                </div>
                <div className={styles.statCardChange}>↗ +{mockStats.growthRate}% 成長</div>
              </div>
              <div className={styles.statCardIcon}>👁️</div>
            </div>
          </section>

          {/* Image Showcase - Masonry Style */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>🔥 熱門圖片展示</h2>
              <button className={styles.viewAllButton}>查看全部 →</button>
            </div>
            <div className={styles.masonryGrid}>
              {mockImages.slice(0, 6).map((image, index) => (
                <div key={image.id} className={styles.masonryItem} style={{
                  gridRow: index % 2 === 0 ? "span 2" : "span 1"
                }}>
                  <img src={image.url} alt={image.filename} />
                  <div className={styles.masonryOverlay}>
                    <div className={styles.masonryInfo}>
                      <div className={styles.masonryTitle}>{image.filename}</div>
                      <div className={styles.masonryMeta}>
                        <span>👁️ {image.views.toLocaleString()}</span>
                        <span>👤 {image.uploader}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Two Column Layout */}
          <div className={styles.twoColumn}>
            {/* Top Users */}
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>🏆 Top 用戶排行</h3>
              <div className={styles.leaderboard}>
                {mockUsers.map((user, index) => (
                  <div key={user.id} className={styles.leaderboardItem}>
                    <div className={styles.rank}>{index + 1}</div>
                    <div className={styles.leaderboardAvatar}>{user.username[0].toUpperCase()}</div>
                    <div className={styles.leaderboardInfo}>
                      <div className={styles.leaderboardName}>{user.username}</div>
                      <div className={styles.leaderboardStats}>
                        {user.uploads} 張 · {user.totalViews.toLocaleString()} 次瀏覽
                      </div>
                    </div>
                    <div className={styles.leaderboardBadge}>{user.tier}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Activity */}
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>🕒 即時動態</h3>
              <div className={styles.timeline}>
                {mockActivities.map((activity) => (
                  <div key={activity.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot}></div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineText}>
                        <strong>{activity.user}</strong> {activity.action}{' '}
                        {activity.target && <span className={styles.timelineTarget}>{activity.target}</span>}
                      </div>
                      <div className={styles.timelineTime}>{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Full Width Image Gallery */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📸 所有圖片</h2>
            <div className={styles.galleryGrid}>
              {mockImages.map((image) => (
                <div key={image.id} className={styles.galleryCard}>
                  <div className={styles.galleryImageWrapper}>
                    <img src={image.url} alt={image.filename} />
                  </div>
                  <div className={styles.galleryCardBody}>
                    <div className={styles.galleryCardTitle}>{image.filename}</div>
                    <div className={styles.galleryCardFooter}>
                      <span className={styles.galleryViews}>👁️ {image.views.toLocaleString()}</span>
                      <span className={styles.galleryDate}>{image.uploadDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
