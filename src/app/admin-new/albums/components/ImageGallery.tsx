"use client";

import { useState, useRef, useEffect } from "react";
import styles from "../albums.module.css";
import ImageViewer from "./ImageViewer";

interface ImageItem {
  id: string;
  note: string | null;
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [localItems, setLocalItems] = useState<ImageItem[]>(items);
  const inputRef = useRef<HTMLInputElement>(null);

  // 更新 localItems 當 items prop 改變
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

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

  // 開始編輯標題
  const handleStartEdit = (e: React.MouseEvent, item: ImageItem) => {
    e.stopPropagation();
    setEditingItemId(item.id);
    setEditValue(item.note || "");
  };

  // 保存標題
  const handleSaveTitle = async (itemId: string) => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/albums/${albumId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ note: editValue.trim() || null }),
      });

      if (res.ok) {
        // 更新本地狀態
        setLocalItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, note: editValue.trim() || null } : item
          )
        );
      } else {
        alert("更新失敗");
      }
    } catch (error) {
      console.error("更新標題失敗:", error);
      alert("更新標題失敗");
    } finally {
      setIsSaving(false);
      setEditingItemId(null);
    }
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditValue("");
  };

  // 鍵盤事件處理
  const handleKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === "Enter") {
      handleSaveTitle(itemId);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // 自動 focus input
  useEffect(() => {
    if (editingItemId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingItemId]);

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
        {localItems.map((item, index) => (
          <div key={item.id} className={styles.imageItem}>
            <div
              className={styles.imageItemImgWrap}
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

            {/* 標題顯示/編輯區域 */}
            <div className={styles.imageTitleArea}>
              {editingItemId === item.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                  onBlur={() => handleSaveTitle(item.id)}
                  className={styles.imageTitleInput}
                  placeholder="輸入標題..."
                  disabled={isSaving}
                />
              ) : (
                <div
                  className={styles.imageTitle}
                  onClick={(e) => handleStartEdit(e, item)}
                  title="點擊編輯標題"
                >
                  {item.note || (
                    <span className={styles.imageTitlePlaceholder}>
                      點擊添加標題...
                    </span>
                  )}
                </div>
              )}
            </div>
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
