"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PasteUpload.module.css";

interface PasteUploadProps {
  onImagePaste: (files: File[]) => void;
  disabled?: boolean;
}

export default function PasteUpload({ onImagePaste, disabled = false }: PasteUploadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, show: false });

  useEffect(() => {
    if (disabled) return;

    const handlePaste = async (e: ClipboardEvent) => {
      e.preventDefault();

      // 檢查是否在輸入框內貼上，避免干擾正常文字輸入
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      try {
        const clipboardItems = e.clipboardData?.items;
        if (!clipboardItems) return;

        const imageFiles: File[] = [];

        for (let i = 0; i < clipboardItems.length; i++) {
          const item = clipboardItems[i];

          // 只處理圖片類型
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              // 驗證檔案大小（20MB 限制）
              if (file.size > 20 * 1024 * 1024) {
                console.warn(`檔案 ${file.name} 過大: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
                continue;
              }

              // 驗證檔案類型
              const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp'];
              if (!allowedTypes.includes(file.type.toLowerCase())) {
                console.warn(`不支援的檔案類型: ${file.type}`);
                continue;
              }

              imageFiles.push(file);
            }
          }
        }

        if (imageFiles.length > 0) {
          console.log(`從剪貼簿提取到 ${imageFiles.length} 張圖片`);
          onImagePaste(imageFiles);

          // 提供視覺反饋
          showPasteFeedback();
        }
      } catch (error) {
        console.error('貼上處理錯誤:', error);
      }
    };

    // 監聽全局貼上事件，而不是只在容器內
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [onImagePaste, disabled]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const tooltipWidth = 280;
    const tooltipHeight = 200;
    let x = e.clientX + 20;
    let y = e.clientY - tooltipHeight / 2;

    // 邊界檢查
    if (x + tooltipWidth > window.innerWidth) x = e.clientX - tooltipWidth - 20;
    if (y < 0) y = 10;
    if (y + tooltipHeight > window.innerHeight) y = window.innerHeight - tooltipHeight - 10;

    setTooltipPosition({ x, y, show: true });
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const tooltipWidth = 280;
    const tooltipHeight = 200;
    let x = e.clientX + 20;
    let y = e.clientY - tooltipHeight / 2;

    // 邊界檢查
    if (x + tooltipWidth > window.innerWidth) x = e.clientX - tooltipWidth - 20;
    if (y < 0) y = 10;
    if (y + tooltipHeight > window.innerHeight) y = window.innerHeight - tooltipHeight - 10;

    setTooltipPosition({ x, y, show: true });
  };

  const handleMouseLeave = () => {
    setTooltipPosition(prev => ({ ...prev, show: false }));
  };

  const showPasteFeedback = () => {
    const container = containerRef.current;
    if (!container) return;

    // 添加貼上動畫效果
    container.classList.add(styles.pasteFeedback);

    setTimeout(() => {
      container.classList.remove(styles.pasteFeedback);
    }, 300);
  };

  return (
    <div
      ref={containerRef}
      className={styles.pasteContainer}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={styles.uploadRules}
        style={{
          position: 'fixed',
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          opacity: tooltipPosition.show ? 1 : 0,
          visibility: tooltipPosition.show ? 'visible' : 'hidden',
          pointerEvents: tooltipPosition.show ? 'auto' : 'none',
          transition: 'opacity 0.3s ease, visibility 0.3s ease',
        }}
      >
        <div className={styles.tooltipHeader}>上傳規則說明</div>
        <div className={styles.tooltipContent}>
          <div className={styles.tooltipItem}>
            <strong>支援格式：</strong> PNG, JPG, JPEG, WebP, GIF
          </div>
          <div className={styles.tooltipItem}>
            <strong>檔案大小：</strong> 建議單張不超過 10MB
          </div>
          <div className={styles.tooltipItem}>
            <strong>上傳方式：</strong> 拖曳 / 點擊 / 貼上
          </div>
          <div className={styles.tooltipItem}>
            <strong>進階功能：</strong> 到期時間、密碼保護
          </div>
        </div>
      </div>
      <div className={styles.pasteHint}>
        <div className={styles.hintText}>
          💡 提示：按下 <kbd>Ctrl+V</kbd> 貼上圖片即可快速上傳
        </div>
      </div>
    </div>
  );
}