"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

  const [data, setData] = useState<AlbumDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAlbumDetail();
  }, [albumId]);

  const loadAlbumDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/albums/${albumId}/items`, {
        credentials: "include",
      });
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
        alert(`移除失敗: ${result.error}`);
      }
    } catch (error) {
      console.error("移除失敗:", error);
      alert("移除失敗");
    }
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
          <h1 className={albumStyles.albumDetailTitle}>{data.album.name}</h1>
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
      />
    </div>
  );
}
