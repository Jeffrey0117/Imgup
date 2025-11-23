"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import styles from "../../images/images.module.css";

interface Album {
  id: string;
  name: string;
  itemCount: number;
}

interface AlbumModalProps {
  show: boolean;
  mappingId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AlbumModal({
  show,
  mappingId,
  onClose,
  onSuccess,
}: AlbumModalProps) {
  const toast = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [showNewAlbumInput, setShowNewAlbumInput] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [imageTitle, setImageTitle] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      loadAlbums();
    }
  }, [show]);

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
        toast.error("載入相簿失敗");
      }
    } catch (error) {
      console.error("載入相簿失敗:", error);
      toast.error("載入相簿失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedAlbumId && !showNewAlbumInput) {
      toast.warning("請選擇一個相簿");
      return;
    }

    if (showNewAlbumInput && !newAlbumName.trim()) {
      toast.warning("請輸入新相簿名稱");
      return;
    }

    try {
      setSubmitting(true);

      // 先驗證並刷新 token
      await fetch("/api/admin/auth/verify", {
        credentials: "include",
      });

      let targetAlbumId = selectedAlbumId;

      // 如果選擇新建相簿
      if (showNewAlbumInput) {
        const createResponse = await fetch("/api/admin/albums", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newAlbumName.trim(),
          }),
        });

        const createData = await createResponse.json();

        if (!createData.success) {
          toast.error(`創建相簿失敗: ${createData.error}`);
          setSubmitting(false);
          return;
        }

        targetAlbumId = createData.data.id;
      }

      // 收藏圖片到相簿
      const addResponse = await fetch(
        `/api/admin/albums/${targetAlbumId}/items`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mappingId,
            note: imageTitle.trim() || null,
          }),
        }
      );

      const addData = await addResponse.json();

      if (addData.success) {
        toast.success("收藏成功！");
        onSuccess();
        onClose();
      } else {
        toast.error(`收藏失敗: ${addData.error}`);
      }
    } catch (error) {
      console.error("收藏失敗:", error);
      toast.error("收藏失敗");
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>收藏到相簿</h3>
        <p className={styles.modalDescription}>選擇要收藏此圖片的相簿</p>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#99a0ab" }}>
            載入中...
          </div>
        ) : (
          <div style={{ marginBottom: "24px" }}>
            {/* Album List */}
            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                marginBottom: "16px",
              }}
            >
              {albums.map((album) => (
                <label
                  key={album.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #2a2d33",
                    marginBottom: "8px",
                    cursor: "pointer",
                    background:
                      selectedAlbumId === album.id && !showNewAlbumInput
                        ? "rgba(45, 122, 45, 0.15)"
                        : "#0f1115",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAlbumId !== album.id || showNewAlbumInput) {
                      e.currentTarget.style.borderColor = "#3a424f";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAlbumId !== album.id || showNewAlbumInput) {
                      e.currentTarget.style.borderColor = "#2a2d33";
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="album"
                    value={album.id}
                    checked={selectedAlbumId === album.id && !showNewAlbumInput}
                    onChange={() => {
                      setSelectedAlbumId(album.id);
                      setShowNewAlbumInput(false);
                    }}
                    style={{ marginRight: "12px", accentColor: "#3ba93b" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#eef",
                      }}
                    >
                      {album.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#99a0ab" }}>
                      {album.itemCount} 張圖片
                    </div>
                  </div>
                </label>
              ))}

              {/* New Album Option */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #2a2d33",
                  cursor: "pointer",
                  background: showNewAlbumInput
                    ? "rgba(45, 122, 45, 0.15)"
                    : "#0f1115",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!showNewAlbumInput) {
                    e.currentTarget.style.borderColor = "#3a424f";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showNewAlbumInput) {
                    e.currentTarget.style.borderColor = "#2a2d33";
                  }
                }}
              >
                <input
                  type="radio"
                  name="album"
                  value="new"
                  checked={showNewAlbumInput}
                  onChange={() => {
                    setShowNewAlbumInput(true);
                    setSelectedAlbumId("");
                  }}
                  style={{ marginRight: "12px", accentColor: "#3ba93b" }}
                />
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#8ed88e",
                  }}
                >
                  ➕ 新增資料夾
                </div>
              </label>
            </div>

            {/* New Album Input */}
            {showNewAlbumInput && (
              <div style={{ marginBottom: "16px" }}>
                <label className={styles.modalLabel}>新相簿名稱</label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="輸入相簿名稱"
                  className={styles.modalInput}
                  autoFocus
                />
              </div>
            )}

            {/* Image Title Input */}
            <div>
              <label className={styles.modalLabel}>圖片標題（可選）</label>
              <input
                type="text"
                value={imageTitle}
                onChange={(e) => setImageTitle(e.target.value)}
                placeholder="為這張圖片添加標題..."
                className={styles.modalInput}
                maxLength={200}
              />
              <div style={{
                fontSize: "12px",
                color: "#99a0ab",
                marginTop: "6px",
                fontStyle: "italic"
              }}>
                設定標題方便日後搜尋和管理
              </div>
            </div>
          </div>
        )}

        <div className={styles.modalActions}>
          <button
            onClick={handleConfirm}
            className={styles.modalConfirm}
            disabled={submitting || loading}
          >
            {submitting ? "處理中..." : "確認"}
          </button>
          <button
            onClick={onClose}
            className={styles.modalCancel}
            disabled={submitting}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
