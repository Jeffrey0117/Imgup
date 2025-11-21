"use client";

import { useState } from "react";
import styles from "./ActivityTimeline.module.css";

interface TimelineItem {
  id: string;
  hash: string;
  filename: string;
  url: string;
  createdAt: string;
  hasPassword: boolean;
  isExpired: boolean;
}

interface ActivityTimelineProps {
  recentUploads: TimelineItem[];
  weeklyStats: { date: string; count: number }[];
}

export default function ActivityTimeline({
  recentUploads,
  weeklyStats,
}: ActivityTimelineProps) {
  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小時前`;
    if (minutes > 0) return `${minutes}分鐘前`;
    return "剛剛";
  };

  // Calculate trend percentage
  const getTrend = () => {
    if (weeklyStats.length < 2) return 0;
    const today = weeklyStats[weeklyStats.length - 1]?.count || 0;
    const yesterday = weeklyStats[weeklyStats.length - 2]?.count || 0;
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const trend = getTrend();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>📊 最新活動</h3>
        </div>
        <div className={styles.trendBadge} data-trend={trend >= 0 ? "up" : "down"}>
          <span className={styles.trendIcon}>{trend >= 0 ? "📈" : "📉"}</span>
          <span className={styles.trendValue}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        </div>
      </div>

      {/* Activity Feed - Only 4 items */}
      <div className={styles.timeline}>
        {recentUploads.slice(0, 4).map((item, index) => (
          <div key={item.id} className={styles.timelineItem}>
            {/* Timeline Dot */}
            <div className={styles.timelineDot}>
              <div className={styles.dot} />
              {index < 3 && <div className={styles.line} />}
            </div>

            {/* Content */}
            <div className={styles.itemContent}>
              <div className={styles.itemHeader}>
                <div className={styles.itemThumbnail}>
                  <img
                    src={item.url}
                    alt={item.filename}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23111' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23444' font-size='14'%3E🖼️%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
                <div className={styles.itemInfo}>
                  <div className={styles.itemFilename}>
                    {item.filename.length > 30
                      ? `${item.filename.substring(0, 30)}...`
                      : item.filename}
                  </div>
                  <div className={styles.itemMeta}>
                    <span className={styles.metaTime}>
                      {formatTimeAgo(item.createdAt)}
                    </span>
                    {item.hasPassword && (
                      <>
                        <span className={styles.metaDivider}>•</span>
                        <span className={styles.metaBadge}>🔒</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className={styles.itemActions}>
                <button
                  className={styles.actionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(
                      `${window.location.origin}/${item.hash}`
                    );
                    alert("已複製連結");
                  }}
                  title="複製連結"
                >
                  📋
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/${item.hash}`, "_blank");
                  }}
                  title="預覽"
                >
                  🔍
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <a href="/admin-new/images" className={styles.viewAllLink}>
        查看所有圖片 →
      </a>
    </div>
  );
}
