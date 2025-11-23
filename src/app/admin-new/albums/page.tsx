"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import styles from "../dashboard.module.css";
import albumStyles from "./albums.module.css";
import AlbumGrid from "./components/AlbumGrid";
import AlbumModal from "./components/AlbumModal";

interface Album {
  id: string;
  name: string;
  description: string | null;
  coverImageHash: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AlbumsPage() {
  const router = useRouter();
  const toast = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/albums", {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setAlbums(data.data);
      } else {
        setError(data.error || "載入相簿失敗");
      }
    } catch (error) {
      console.error("載入相簿失敗:", error);
      setError("載入相簿失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      toast.warning("請輸入相簿名稱");
      return;
    }

    try {
      const response = await fetch("/api/admin/albums", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newAlbumName.trim(),
          description: newAlbumDescription.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setNewAlbumName("");
        setNewAlbumDescription("");
        loadAlbums();
      } else {
        toast.error(`創建失敗: ${data.error}`);
      }
    } catch (error) {
      console.error("創建相簿失敗:", error);
      toast.error("創建相簿失敗");
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    const confirmed = confirm("確定要刪除此相簿嗎？此操作無法撤銷！");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/albums/${albumId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        loadAlbums();
      } else {
        toast.error(`刪除失敗: ${data.error}`);
      }
    } catch (error) {
      console.error("刪除相簿失敗:", error);
      toast.error("刪除相簿失敗");
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h3>載入失敗</h3>
        <p>{error}</p>
        <button onClick={loadAlbums} className={styles.retryButton}>
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>相簿管理</h1>
          <p className={styles.pageSubtitle}>
            共 {albums.length} 個相簿
          </p>
        </div>
        <div className={styles.topBarActions}>
          <button onClick={loadAlbums} className={styles.refreshButton}>
            🔄 刷新
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className={albumStyles.createButton}
          >
            ➕ 新增相簿
          </button>
        </div>
      </div>

      {/* Album Grid */}
      <AlbumGrid
        albums={albums}
        onDelete={handleDeleteAlbum}
        onCreate={() => setShowCreateModal(true)}
      />

      {/* Create Album Modal */}
      {showCreateModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowCreateModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.pageTitle} style={{ fontSize: "22px" }}>
              創建新相簿
            </h3>
            <p className={styles.pageSubtitle} style={{ marginBottom: "24px" }}>
              為你的圖片創建一個新的收藏相簿
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#cfe",
                  marginBottom: "8px",
                }}
              >
                相簿名稱 *
              </label>
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="輸入相簿名稱"
                className={styles.input}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#cfe",
                  marginBottom: "8px",
                }}
              >
                相簿描述
              </label>
              <input
                type="text"
                value={newAlbumDescription}
                onChange={(e) => setNewAlbumDescription(e.target.value)}
                placeholder="（選填）相簿描述"
                className={styles.input}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={handleCreateAlbum}
                className={styles.submitButton}
              >
                創建相簿
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAlbumName("");
                  setNewAlbumDescription("");
                }}
                className={styles.cancelButton}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
