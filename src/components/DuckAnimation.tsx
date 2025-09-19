"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
    }, 100); // 加速：每100ms切換一次圖片

    return () => clearInterval(interval);
  }, [isUploading]);

  if (!isUploading) return null;

  // 使用 PNG 圖片輪播產生 GIF 效果
  const getDuckImage = () => {
    const frameNumber = currentFrame + 1; // 1, 2, 3
    return (
      <Image
        src={`/duck_0${frameNumber}.png`}
        alt={`Duck frame ${frameNumber}`}
        width={60}
        height={60}
        className={styles.duckSvg}
        style={{ background: "transparent" }}
        priority
      />
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.duckContainer}>{getDuckImage()}</div>

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
