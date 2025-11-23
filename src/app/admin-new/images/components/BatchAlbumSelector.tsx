"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import styles from "../images.module.css";

interface Album {
  id: string;
  name: string;
  itemCount: number;
}

interface BatchAlbumSelectorProps {
  show: boolean;
  mappingIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchAlbumSelector({
  show,
  mappingIds,
  onClose,
  onSuccess,
}: BatchAlbumSelectorProps) {
  const toast = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [showNewAlbumInput, setShowNewAlbumInput] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
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

      // 批量收藏圖片到相簿
      let successCount = 0;
      let failedCount = 0;

      for (const mappingId of mappingIds) {
        try {
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
                note: null, // 批量收藏不設置標題
              }),
            }
          );

          const addData = await addResponse.json();

          if (addData.success) {
            successCount++;
          } else {
            failedCount++;
            console.error(`收藏圖片 ${mappingId} 失敗:`, addData.error);
          }
        } catch (error) {
          failedCount++;
          console.error(`收藏圖片 ${mappingId} 失敗:`, error);
        }
      }

      if (successCount > 0) {
        if (failedCount > 0) {
          toast.warning(`成功收藏 ${successCount} 張圖片，${failedCount} 張失敗`);
        } else {
          toast.success(`成功收藏 ${successCount} 張圖片`);
        }
        onSuccess();
        onClose();
      } else {
        toast.error("批量收藏失敗");
      }
    } catch (error) {
      console.error("批量收藏失敗:", error);
      toast.error("批量收藏失敗");
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>批量收藏到相簿</h3>
        <p className={styles.modalDescription}>
          將選中的 {mappingIds.length} 張圖片收藏到相簿
        </p>

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
                border: "1px solid #2a2d33",
                borderRadius: "8px",
              }}
            >
              {albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => {
                    setSelectedAlbumId(album.id);
                    setShowNewAlbumInput(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    background:
                      selectedAlbumId === album.id ? "rgba(88, 194, 88, 0.15)" : "transparent",
                    borderBottom: "1px solid #2a2d33",
                    transition: "background 0.2s ease",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#eef" }}>{album.name}</div>
                  <div style={{ fontSize: "13px", color: "#99a0ab", marginTop: "4px" }}>
                    {album.itemCount} 張圖片
                  </div>
                </div>
              ))}
            </div>

            {/* Create New Album Option */}
            <div
              onClick={() => {
                setShowNewAlbumInput(true);
                setSelectedAlbumId("");
              }}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                background: showNewAlbumInput ? "rgba(88, 194, 88, 0.15)" : "transparent",
                borderRadius: "8px",
                border: "1px dashed #58c258",
                transition: "background 0.2s ease",
                marginBottom: showNewAlbumInput ? "16px" : "0",
              }}
            >
              <div style={{ fontWeight: 600, color: "#58c258" }}>➕ 創建新相簿</div>
            </div>

            {/* New Album Input */}
            {showNewAlbumInput && (
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="輸入新相簿名稱"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #2a2d33",
                  borderRadius: "8px",
                  background: "#0f1115",
                  color: "#eef",
                  fontSize: "14px",
                }}
                autoFocus
              />
            )}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #2a2d33",
              background: "#15171d",
              color: "#cfe",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.5 : 1,
            }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || loading}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #58c258",
              background: "#2d7a2d",
              color: "white",
              fontWeight: 600,
              cursor: submitting || loading ? "not-allowed" : "pointer",
              opacity: submitting || loading ? 0.5 : 1,
            }}
          >
            {submitting ? "處理中..." : "確認收藏"}
          </button>
        </div>
      </div>
    </div>
  );
}
