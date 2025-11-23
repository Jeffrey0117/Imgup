"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import styles from "../../dashboard.module.css";
import albumStyles from "../albums.module.css";
import ImageGallery from "../components/ImageGallery";

interface Album {
  id: string;
  name: string;
  description: string | null;
  coverImageHash: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AlbumItem {
  id: string;
  order: number;
  note: string | null;
  createdAt: string;
  mapping: {
    id: string;
    hash: string;
    filename: string;
    url: string;
    shortUrl: string;
    createdAt: string;
    expiresAt: string | null;
    isDeleted: boolean;
    fileExtension: string | null;
  };
}

interface AlbumDetailData {
  album: Album;
  items: AlbumItem[];
}

export default function AlbumDetailPage() {
  const router = useRouter();
  const params = useParams();
  const albumId = params.id as string;
  const toast = useToast();

  const [data, setData] = useState<AlbumDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  useEffect(() => {
    loadAlbumDetail();
  }, [albumId]);

  const loadAlbumDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/albums/${albumId}/items`, {
        credentials: "include",
      });

      // 檢查是否未授權，直接跳轉登入頁
      if (response.status === 401) {
        router.push("/admin-new/login");
        return;
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "載入相簿失敗");
      }
    } catch (error) {
      console.error("載入相簿失敗:", error);
      setError("載入相簿失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch(
        `/api/admin/albums/${albumId}/items/${itemId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (result.success) {
        loadAlbumDetail(); // Reload to update the list
      } else {
        toast.error(`移除失敗: ${result.error}`);
      }
    } catch (error) {
      console.error("移除失敗:", error);
      toast.error("移除失敗");
    }
  };

  const handleSetCover = async (hash: string) => {
    try {
      const response = await fetch(`/api/admin/albums/${albumId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ coverImageHash: hash }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setData((prev) =>
          prev
            ? {
                ...prev,
                album: { ...prev.album, coverImageHash: hash },
              }
            : null
        );
        toast.success("封面已更新");
      } else {
        toast.error(`設定封面失敗: ${result.error}`);
      }
    } catch (error) {
      console.error("設定封面失敗:", error);
      toast.error("設定封面失敗");
    }
  };

  const handleTitleEdit = () => {
    if (!data) return;
    setEditedTitle(data.album.name);
    setIsEditingTitle(true);
  };

  const handleTitleSave = async () => {
    if (!data || !editedTitle.trim()) return;

    try {
      const response = await fetch(`/api/admin/albums/${albumId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: editedTitle.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setData((prev) =>
          prev
            ? {
                ...prev,
                album: { ...prev.album, name: editedTitle.trim() },
              }
            : null
        );
        setIsEditingTitle(false);
      } else {
        toast.error(`更新名稱失敗: ${result.error}`);
      }
    } catch (error) {
      console.error("更新名稱失敗:", error);
      toast.error("更新名稱失敗");
    }
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setEditedTitle("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>載入中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.errorContainer}>
        <h3>載入失敗</h3>
        <p>{error}</p>
        <button onClick={loadAlbumDetail} className={styles.retryButton}>
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Album Header */}
      <div className={albumStyles.albumDetailHeader}>
        <div className={albumStyles.albumDetailInfo}>
          {isEditingTitle ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") handleTitleCancel();
                }}
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  padding: "4px 8px",
                  border: "2px solid #4a9eff",
                  borderRadius: "4px",
                  background: "#1a1a1a",
                  color: "#fff",
                }}
                autoFocus
              />
              <button
                onClick={handleTitleSave}
                style={{
                  padding: "4px 12px",
                  background: "#4a9eff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ✓
              </button>
              <button
                onClick={handleTitleCancel}
                style={{
                  padding: "4px 12px",
                  background: "#666",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <h1
              className={albumStyles.albumDetailTitle}
              onClick={handleTitleEdit}
              style={{ cursor: "pointer" }}
              title="點擊編輯標題"
            >
              {data.album.name}
            </h1>
          )}
          {data.album.description && (
            <p className={albumStyles.albumDetailDescription}>
              {data.album.description}
            </p>
          )}
          <div className={albumStyles.albumDetailMeta}>
            <span>{data.items.length} 張圖片</span>
            <span>創建於 {formatDate(data.album.createdAt)}</span>
            {data.album.updatedAt !== data.album.createdAt && (
              <span>更新於 {formatDate(data.album.updatedAt)}</span>
            )}
          </div>
        </div>
        <div className={albumStyles.albumDetailActions}>
          <button
            onClick={() => router.push("/admin-new/albums")}
            className={albumStyles.backButton}
          >
            ← 返回列表
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <ImageGallery
        items={data.items}
        albumId={albumId}
        onRemove={handleRemoveItem}
        onSetCover={handleSetCover}
        currentCoverHash={data.album.coverImageHash}
      />
    </div>
  );
}
