"use client";

import { useState } from "react";
import styles from "./DarkSidebarLayout.module.css";
import { mockStats, mockImages, mockUsers, mockActivities } from "../mockData";

export default function DarkSidebarLayout() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % mockImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + mockImages.length) % mockImages.length
    );
  };

  return (
    <div className={styles.layout}>
      {/* Dark Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>📊</div>
          <div className={styles.logoText}>
            <div className={styles.brandName}>duk.tw</div>
            <div className={styles.brandSub}>Admin Panel</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <a href="#" className={`${styles.navItem} ${styles.active}`}>
            <span className={styles.navIcon}>📊</span>
            <span className={styles.navText}>Dashboard</span>
          </a>
          <a href="#" className={styles.navItem}>
            <span className={styles.navIcon}>👥</span>
            <span className={styles.navText}>用戶管理</span>
          </a>
          <a href="#" className={styles.navItem}>
            <span className={styles.navIcon}>🖼️</span>
            <span className={styles.navText}>圖片管理</span>
          </a>
          <a href="#" className={styles.navItem}>
            <span className={styles.navIcon}>📈</span>
            <span className={styles.navText}>數據分析</span>
          </a>
          <a href="#" className={styles.navItem}>
            <span className={styles.navIcon}>🔐</span>
            <span className={styles.navText}>安全管理</span>
          </a>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminInfo}>
            <div className={styles.adminAvatar}>A</div>
            <div className={styles.adminDetails}>
              <div className={styles.adminName}>Admin User</div>
              <div className={styles.adminRole}>管理員</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Top Bar */}
        <header className={styles.topBar}>
          <h1 className={styles.pageTitle}>儀表板總覽</h1>
          <div className={styles.topBarActions}>
            <button className={styles.iconButton}>🔔</button>
            <button className={styles.iconButton}>⚙️</button>
            <button className={styles.logoutButton}>登出</button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#3b82f6" }}>
              👥
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>
                {mockStats.totalUsers.toLocaleString()}
              </div>
              <div className={styles.statLabel}>總用戶數</div>
              <div className={styles.statChange}>+{mockStats.todayUsers} 今日</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#10b981" }}>
              🖼️
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>
                {mockStats.totalImages.toLocaleString()}
              </div>
              <div className={styles.statLabel}>總圖片數</div>
              <div className={styles.statChange}>+12% 本週</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#f59e0b" }}>
              👁️
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>
                {(mockStats.totalViews / 1000000).toFixed(1)}M
              </div>
              <div className={styles.statLabel}>總瀏覽數</div>
              <div className={styles.statChange}>+{mockStats.growthRate}% 成長</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#8b5cf6" }}>
              ⚡
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>
                {mockStats.activeUsers.toLocaleString()}
              </div>
              <div className={styles.statLabel}>活躍用戶</div>
              <div className={styles.statChange}>本月</div>
            </div>
          </div>
        </div>

        {/* Image Gallery with Carousel */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>🔥 熱門圖片輪播</h2>
            <div className={styles.carouselControls}>
              <button className={styles.carouselButton} onClick={prevImage}>
                ◀
              </button>
              <span className={styles.carouselIndicator}>
                {currentImageIndex + 1} / {mockImages.length}
              </span>
              <button className={styles.carouselButton} onClick={nextImage}>
                ▶
              </button>
            </div>
          </div>
          <div className={styles.carousel}>
            <div className={styles.carouselImage}>
              <img
                src={mockImages[currentImageIndex].url}
                alt={mockImages[currentImageIndex].filename}
              />
              <div className={styles.imageInfo}>
                <div className={styles.imageFilename}>
                  {mockImages[currentImageIndex].filename}
                </div>
                <div className={styles.imageMeta}>
                  <span>👁️ {mockImages[currentImageIndex].views.toLocaleString()}</span>
                  <span>👤 {mockImages[currentImageIndex].uploader}</span>
                  <span>📅 {mockImages[currentImageIndex].uploadDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Layout - Users and Activities */}
        <div className={styles.gridLayout}>
          {/* Recent Users */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>👥 最近用戶</h3>
            <div className={styles.userList}>
              {mockUsers.slice(0, 5).map((user) => (
                <div key={user.id} className={styles.userItem}>
                  <div className={styles.userAvatar}>{user.username[0].toUpperCase()}</div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user.username}</div>
                    <div className={styles.userStats}>
                      {user.uploads} 張圖片 · {user.totalViews.toLocaleString()} 次瀏覽
                    </div>
                  </div>
                  <div className={styles.userBadge}>{user.tier}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>📋 最近活動</h3>
            <div className={styles.activityList}>
              {mockActivities.map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  <div className={styles.activityIcon}>{
                    activity.type === 'upload' ? '📤' :
                    activity.type === 'delete' ? '🗑️' :
                    activity.type === 'user' ? '👤' : '👁️'
                  }</div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityText}>
                      <strong>{activity.user}</strong> {activity.action}{' '}
                      {activity.target && <span className={styles.activityTarget}>{activity.target}</span>}
                    </div>
                    <div className={styles.activityTime}>{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Image Grid */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🖼️ 所有圖片預覽</h2>
          <div className={styles.imageGrid}>
            {mockImages.map((image) => (
              <div key={image.id} className={styles.imageCard}>
                <img src={image.url} alt={image.filename} />
                <div className={styles.imageCardInfo}>
                  <div className={styles.imageCardTitle}>{image.filename}</div>
                  <div className={styles.imageCardMeta}>
                    👁️ {image.views.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
