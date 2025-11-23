"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import styles from "../../dashboard.module.css";
import detailStyles from "./detail.module.css";
import AlbumModal from "../../albums/components/AlbumModal";

interface ImageDetail {
  id: string;
  hash: string;
  filename: string;
  url: string;
  shortUrl: string;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  hasPassword: boolean;
  password: string | null;
  isDeleted: boolean;
}

export default function ImageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const hash = params.hash as string;
  const toast = useToast();

  const [image, setImage] = useState<ImageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAlbumModal, setShowAlbumModal] = useState(false);

  useEffect(() => {
    if (hash) {
      loadImageDetail();
    }
  }, [hash]);

  const loadImageDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/mappings/${hash}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setImage(data.data);
      } else {
        setError(data.error || "載入圖片詳情失敗");
      }
    } catch (error) {
      console.error("載入圖片詳情失敗:", error);
      setError("載入圖片詳情失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    if (!image) return;
    const url = `${window.location.origin}/${image.hash}`;
    navigator.clipboard.writeText(url);
    toast.success("網址已複製到剪貼簿");
  };

  const handleDelete = async () => {
    if (!image) return;

    const confirmed = confirm("確定要刪除這張圖片嗎？此操作無法撤銷！");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/mappings/${image.hash}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("圖片已刪除");
        router.push("/admin-new/images");
      } else {
        toast.error(`刪除失敗: ${data.error}`);
      }
    } catch (error) {
      console.error("刪除失敗:", error);
      toast.error("刪除失敗");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-TW");
  };

  const getFileExtension = (filename: string) => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()?.toLowerCase() : "";
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>載入中...</div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className={styles.errorContainer}>
        <h3>載入失敗</h3>
        <p>{error || "找不到圖片"}</p>
        <button
          onClick={() => router.push("/admin-new/images")}
          className={styles.retryButton}
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>圖片詳情</h1>
          <p className={styles.pageSubtitle}>{image.filename}</p>
        </div>
        <div className={styles.topBarActions}>
          <button
            onClick={() => router.push("/admin-new/images")}
            className={styles.refreshButton}
          >
            ← 返回列表
          </button>
        </div>
      </div>

      <div className={detailStyles.container}>
        {/* Image Preview */}
        <div className={detailStyles.previewSection}>
          <div className={detailStyles.imageWrap}>
            <img
              src={image.url}
              alt={image.filename}
              className={detailStyles.image}
            />
          </div>
          <div className={detailStyles.quickActions}>
            <button
              onClick={handleCopyUrl}
              className={detailStyles.actionButton}
            >
              📋 複製連結
            </button>
            <button
              onClick={() => window.open(`/${image.hash}`, "_blank")}
              className={detailStyles.actionButton}
            >
              🔍 預覽
            </button>
            <button
              onClick={() => window.open(image.url, "_blank")}
              className={detailStyles.actionButton}
            >
              ⬇️ 下載
            </button>
            <button
              onClick={() => setShowAlbumModal(true)}
              className={detailStyles.actionButton}
            >
              ⭐ 收藏
            </button>
            <button
              onClick={handleDelete}
              className={detailStyles.actionButtonDanger}
            >
              🗑️ 刪除
            </button>
          </div>
        </div>

        {/* Info Sections */}
        <div className={detailStyles.infoSection}>
          {/* Basic Info */}
          <div className={detailStyles.infoCard}>
            <h3 className={detailStyles.cardTitle}>基本資訊</h3>
            <div className={detailStyles.infoGrid}>
              <div className={detailStyles.infoRow}>
                <span className={detailStyles.infoLabel}>檔案名稱</span>
                <span className={detailStyles.infoValue}>{image.filename}</span>
              </div>
              <div className={detailStyles.infoRow}>
                <span className={detailStyles.infoLabel}>檔案類型</span>
                <span className={detailStyles.infoValue}>
                  {getFileExtension(image.filename)?.toUpperCase() || "N/A"}
                </span>
              </div>
              <div className={detailStyles.infoRow}>
                <span className={detailStyles.infoLabel}>短鏈 Hash</span>
                <span className={detailStyles.infoValueMono}>
                  {image.hash}
                </span>
              </div>
              <div className={detailStyles.infoRow}>
                <span className={detailStyles.infoLabel}>完整網址</span>
                <span className={detailStyles.infoValueMono}>
                  {window.location.origin}/{image.hash}
                </span>
              </div>
            </div>
          </div>

          {/* Status & Settings */}
          <div className={detailStyles.infoCard}>
            <h3 className={detailStyles.cardTitle}>狀態與設定</h3>
            <div className={detailStyles.infoGrid}>
              <div className={detailStyles.infoRow}>
                <span className={detailStyles.infoLabel}>上傳時間</span>
                <span className={detailStyles.infoValue}>
                  {formatTime(image.createdAt)}
                </span>
              </div>
              <div className={detailStyles.infoRow}>
                <span className={detailStyles.infoLabel}>過期時間</span>
                <span className={detailStyles.infoValue}>
                  {image.expiresAt ? formatTime(image.expiresAt) : "永不過期"}
                </span>
              </div>
              <div className={detailStyles.infoRow}>
                <span className={detailStyles.infoLabel}>密碼保護</span>
                <span className={detailStyles.infoValue}>
                  {image.hasPassword ? (
                    <>
                      是 <span className={detailStyles.passwordValue}>({image.password})</span>
                    </>
                  ) : (
                    "無"
                  )}
                </span>
              </div>
              <div className={detailStyles.infoRow}>
                <span className={detailStyles.infoLabel}>狀態</span>
                <span className={detailStyles.infoValue}>
                  {image.isDeleted ? (
                    <span className={detailStyles.statusBadgeRed}>已刪除</span>
                  ) : image.isExpired ? (
                    <span className={detailStyles.statusBadgeOrange}>已過期</span>
                  ) : (
                    <span className={detailStyles.statusBadgeGreen}>正常</span>
                  )}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Album Modal */}
      {showAlbumModal && image && (
        <AlbumModal
          show={showAlbumModal}
          mappingId={image.id}
          onClose={() => setShowAlbumModal(false)}
          onSuccess={() => {
            setShowAlbumModal(false);
          }}
        />
      )}
    </div>
  );
}
