"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PasteUpload.module.css";

interface PasteUploadProps {
  onImagePaste: (files: File[]) => void;
  disabled?: boolean;
}

export default function PasteUpload({ onImagePaste, disabled = false }: PasteUploadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

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
    >
      <div className={styles.pasteHint}>
        <div
          className={styles.hintText}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          💡 提示：按下 <kbd>Ctrl+V</kbd> 貼上圖片即可快速上傳
        </div>
        
        {showTooltip && (
          <div className={styles.tooltip}>
            <div className={styles.tooltipContent}>
              <h4>📋 上傳規則詳細說明</h4>
              <div className={styles.rulesList}>
                <div className={styles.ruleItem}>
                  <span className={styles.ruleIcon}>📁</span>
                  <span>支援格式：PNG、JPG、JPEG、WebP、GIF、BMP</span>
                </div>
                <div className={styles.ruleItem}>
                  <span className={styles.ruleIcon}>📏</span>
                  <span>檔案大小：單張最大 20MB</span>
                </div>
                <div className={styles.ruleItem}>
                  <span className={styles.ruleIcon}>🔄</span>
                  <span>上傳方式：拖曳檔案、點擊選擇、剪貼簿貼上</span>
                </div>
                <div className={styles.ruleItem}>
                  <span className={styles.ruleIcon}>⚡</span>
                  <span>快捷鍵：Ctrl+V 快速貼上圖片</span>
                </div>
                <div className={styles.ruleItem}>
                  <span className={styles.ruleIcon}>🛡️</span>
                  <span>自動檢測：檔案類型和大小驗證</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}