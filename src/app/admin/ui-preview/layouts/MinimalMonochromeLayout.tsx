"use client";

import styles from "./MinimalMonochromeLayout.module.css";
import { mockStats, mockImages, mockUsers } from "../mockData";

export default function MinimalMonochromeLayout() {
  return (
    <div className={styles.layout}>
      {/* Minimal Header */}
      <header className={styles.header}>
        <div className={styles.logo}>duk.tw</div>
        <nav className={styles.nav}>
          <a href="#" className={styles.navLink}>Dashboard</a>
          <a href="#" className={styles.navLink}>Users</a>
          <a href="#" className={styles.navLink}>Images</a>
          <a href="#" className={styles.navLink}>Analytics</a>
        </nav>
        <div className={styles.user}>Admin</div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Stats - Minimal Cards */}
        <section className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{mockStats.totalUsers.toLocaleString()}</div>
            <div className={styles.statLabel}>Users</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{mockStats.totalImages.toLocaleString()}</div>
            <div className={styles.statLabel}>Images</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{(mockStats.totalViews / 1000000).toFixed(1)}M</div>
            <div className={styles.statLabel}>Views</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{mockStats.growthRate}%</div>
            <div className={styles.statLabel}>Growth</div>
          </div>
        </section>

        {/* Featured Image - Minimal */}
        <section className={styles.featured}>
          <h2 className={styles.sectionTitle}>Featured</h2>
          <div className={styles.featuredImage}>
            <img src={mockImages[0].url} alt={mockImages[0].filename} />
            <div className={styles.featuredCaption}>
              <span className={styles.featuredFilename}>{mockImages[0].filename}</span>
              <span className={styles.featuredViews}>{mockImages[0].views.toLocaleString()} views</span>
            </div>
          </div>
        </section>

        {/* Image Grid - Minimal */}
        <section className={styles.gallery}>
          <h2 className={styles.sectionTitle}>Gallery</h2>
          <div className={styles.gridMinimal}>
            {mockImages.map((image) => (
              <div key={image.id} className={styles.gridItem}>
                <div className={styles.gridImage}>
                  <img src={image.url} alt={image.filename} />
                </div>
                <div className={styles.gridCaption}>
                  <div className={styles.gridFilename}>{image.filename}</div>
                  <div className={styles.gridViews}>{image.views.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Users - Minimal List */}
        <section className={styles.users}>
          <h2 className={styles.sectionTitle}>Top Users</h2>
          <div className={styles.userList}>
            {mockUsers.map((user, index) => (
              <div key={user.id} className={styles.userRow}>
                <div className={styles.userRank}>{String(index + 1).padStart(2, '0')}</div>
                <div className={styles.userName}>{user.username}</div>
                <div className={styles.userUploads}>{user.uploads} uploads</div>
                <div className={styles.userViews}>{user.totalViews.toLocaleString()} views</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
