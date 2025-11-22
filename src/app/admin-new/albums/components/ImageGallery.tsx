"use client";

import { useState } from "react";
import styles from "../albums.module.css";
import ImageViewer from "./ImageViewer";

interface ImageItem {
  id: string;
  mapping: {
    hash: string;
    filename: string;
    url: string;
    createdAt: string;
  };
}

interface ImageGalleryProps {
  items: ImageItem[];
  albumId: string;
  onRemove?: (itemId: string) => void;
}

export default function ImageGallery({
  items,
  albumId,
  onRemove,
}: ImageGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setViewerOpen(true);
  };

  const handleRemove = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();

    const confirmed = confirm("確定要從相簿移除此圖片嗎？");
    if (!confirmed) return;

    if (onRemove) {
      onRemove(itemId);
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#99a0ab" }}>
        <h3 style={{ fontSize: "20px", color: "#cfe", margin: "0 0 12px 0" }}>
          此相簿尚無圖片
        </h3>
        <p style={{ fontSize: "14px", margin: 0 }}>
          前往圖片管理頁面收藏圖片到此相簿
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.imageGallery}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className={styles.imageItem}
            onClick={() => handleImageClick(index)}
          >
            <img
              src={item.mapping.url}
              alt={item.mapping.filename}
              className={styles.imageItemImg}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23111' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23444' font-size='14'%3E載入失敗%3C/text%3E%3C/svg%3E";
              }}
            />
            {onRemove && (
              <button
                className={styles.imageRemove}
                onClick={(e) => handleRemove(e, item.id)}
                title="從相簿移除"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Image Viewer */}
      {viewerOpen && (
        <ImageViewer
          images={items.map((item) => ({
            url: item.mapping.url,
            filename: item.mapping.filename,
            hash: item.mapping.hash,
          }))}
          initialIndex={currentIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
