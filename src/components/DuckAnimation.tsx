"use client";

import { useState, useEffect } from "react";
import styles from "./DuckAnimation.module.css";

interface DuckAnimationProps {
  isUploading: boolean;
  progress: number;
}

export default function DuckAnimation({
  isUploading,
  progress,
}: DuckAnimationProps) {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    if (!isUploading) {
      setCurrentFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % 3);
    }, 300); // 每300ms切換一次圖片

    return () => clearInterval(interval);
  }, [isUploading]);

  if (!isUploading) return null;

  // 使用 SVG 鴨子圖案，根據當前幀調整位置和樣式
  const getDuckSvg = () => {
    const walkOffset = currentFrame === 1 ? 3 : currentFrame === 2 ? -2 : 0;
    const rotation = currentFrame === 1 ? 2 : currentFrame === 2 ? -3 : 0;

    return (
      <svg
        width="60"
        height="60"
        viewBox="0 0 100 100"
        className={styles.duckSvg}
        style={{
          transform: `translateY(${walkOffset}px) rotate(${rotation}deg)`,
          transition: "transform 0.3s ease",
        }}
      >
        {/* 鴨子身體 */}
        <ellipse cx="50" cy="65" rx="25" ry="18" fill="#FFA500" />
        {/* 鴨子頭 */}
        <circle cx="45" cy="40" r="15" fill="#FFA500" />
        {/* 鴨嘴 */}
        <ellipse cx="32" cy="42" rx="8" ry="4" fill="#FF8C00" />
        {/* 眼睛 */}
        <circle cx="42" cy="35" r="3" fill="#000" />
        <circle cx="43" cy="33" r="1" fill="#FFF" />
        {/* 翅膀 */}
        <ellipse
          cx="55"
          cy="58"
          rx="8"
          ry="12"
          fill="#FF8C00"
          transform="rotate(20 55 58)"
        />
        {/* 腳 (根據幀變化位置) */}
        <rect
          x="38"
          y="80"
          width="3"
          height="8"
          fill="#FF6600"
          transform={`rotate(${
            currentFrame === 1 ? -10 : currentFrame === 2 ? 10 : 0
          } 40 84)`}
        />
        <rect
          x="48"
          y="80"
          width="3"
          height="8"
          fill="#FF6600"
          transform={`rotate(${
            currentFrame === 1 ? 10 : currentFrame === 2 ? -10 : 0
          } 50 84)`}
        />
        {/* 腳掌 */}
        <ellipse cx="39" cy="90" rx="4" ry="2" fill="#FF6600" />
        <ellipse cx="49" cy="90" rx="4" ry="2" fill="#FF6600" />
      </svg>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.duckContainer}>{getDuckSvg()}</div>

      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={styles.progressText}>
          上傳中... {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}
