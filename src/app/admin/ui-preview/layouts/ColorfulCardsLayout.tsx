"use client";

import styles from "./ColorfulCardsLayout.module.css";
import { mockStats, mockImages, mockUsers, mockActivities } from "../mockData";

export default function ColorfulCardsLayout() {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
    "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"
  ];

  return (
    <div className={styles.layout}>
      {/* Colorful Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoEmoji}>🎨</span>
          <span className={styles.logoText}>duk.tw</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.headerButton}>🔔</button>
          <button className={styles.headerButton}>⚙️</button>
          <div className={styles.profile}>
            <div className={styles.profilePic}>A</div>
            <span>Admin</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Hero Card */}
        <div className={styles.heroCard}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>✨ 歡迎回來！</h1>
            <p className={styles.heroText}>今天有 {mockStats.todayUsers} 位新用戶加入你的平台</p>
          </div>
          <div className={styles.heroIllustration}>🚀</div>
        </div>

        {/* Stats Cards - Colorful */}
        <div className={styles.statsGrid}>
          <div className={styles.colorCard} style={{ background: colors[0] }}>
            <div className={styles.cardIcon}>👥</div>
            <div className={styles.cardValue}>{mockStats.totalUsers.toLocaleString()}</div>
            <div className={styles.cardLabel}>總用戶數</div>
          </div>

          <div className={styles.colorCard} style={{ background: colors[1] }}>
            <div className={styles.cardIcon}>🖼️</div>
            <div className={styles.cardValue}>{mockStats.totalImages.toLocaleString()}</div>
            <div className={styles.cardLabel}>總圖片數</div>
          </div>

          <div className={styles.colorCard} style={{ background: colors[2] }}>
            <div className={styles.cardIcon}>👁️</div>
            <div className={styles.cardValue}>{(mockStats.totalViews / 1000000).toFixed(1)}M</div>
            <div className={styles.cardLabel}>總瀏覽數</div>
          </div>

          <div className={styles.colorCard} style={{ background: colors[3] }}>
            <div className={styles.cardIcon}>⚡</div>
            <div className={styles.cardValue}>{mockStats.activeUsers.toLocaleString()}</div>
            <div className={styles.cardLabel}>活躍用戶</div>
          </div>
        </div>

        {/* Image Showcase - Colorful Cards */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🖼️ 熱門圖片</h2>
          <div className={styles.imageShowcase}>
            {mockImages.map((image, index) => (
              <div
                key={image.id}
                className={styles.showcaseCard}
                style={{ borderColor: colors[index % colors.length] }}
              >
                <div className={styles.showcaseImage}>
                  <img src={image.url} alt={image.filename} />
                  <div
                    className={styles.showcaseBadge}
                    style={{ background: colors[index % colors.length] }}
                  >
                    {image.views.toLocaleString()}
                  </div>
                </div>
                <div className={styles.showcaseInfo}>
                  <div className={styles.showcaseTitle}>{image.filename}</div>
                  <div className={styles.showcaseMeta}>
                    <span>👤 {image.uploader}</span>
                    <span>📅 {image.uploadDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Users and Activities */}
        <div className={styles.twoColumns}>
          {/* Users Card */}
          <div className={styles.whiteCard}>
            <h3 className={styles.cardTitle}>🏆 Top 用戶</h3>
            <div className={styles.userCards}>
              {mockUsers.slice(0, 5).map((user, index) => (
                <div
                  key={user.id}
                  className={styles.userCard}
                  style={{ borderLeftColor: colors[index] }}
                >
                  <div className={styles.userCardRank} style={{ background: colors[index] }}>
                    #{index + 1}
                  </div>
                  <div className={styles.userCardInfo}>
                    <div className={styles.userCardName}>{user.username}</div>
                    <div className={styles.userCardStats}>
                      {user.uploads} 張 · {user.totalViews.toLocaleString()} 次瀏覽
                    </div>
                  </div>
                  <div className={styles.userCardBadge} style={{ background: colors[index], opacity: 0.2 }}>
                    {user.tier}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activities Card */}
          <div className={styles.whiteCard}>
            <h3 className={styles.cardTitle}>🕒 最近活動</h3>
            <div className={styles.activityCards}>
              {mockActivities.map((activity, index) => (
                <div key={activity.id} className={styles.activityCard}>
                  <div
                    className={styles.activityDot}
                    style={{ background: colors[index % colors.length] }}
                  ></div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityText}>
                      <strong>{activity.user}</strong> {activity.action}{' '}
                      {activity.target && <span>{activity.target}</span>}
                    </div>
                    <div className={styles.activityTime}>{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
