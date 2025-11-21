"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../dashboard.module.css";
import imgStyles from "./images.module.css";

interface ImageItem {
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

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function ImagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [batchOperation, setBatchOperation] = useState<string>("");
  const [batchPassword, setBatchPassword] = useState("");
  const [batchExpiry, setBatchExpiry] = useState("");

  useEffect(() => {
    loadImages();
  }, [searchParams]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = parseInt(searchParams.get("pageSize") || "20");
      const search = searchParams.get("search") || "";
      const status = searchParams.get("status") || "";

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (search) params.append("search", search);
      if (status && status !== "all") params.append("status", status);

      const response = await fetch(`/api/admin/mappings?${params}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setImages(data.data.items);
        setPagination(data.data.pagination);
      } else {
        setError(data.error || "載入圖片列表失敗");
      }
    } catch (error) {
      console.error("載入圖片列表失敗:", error);
      setError("載入圖片列表失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL({ search: searchQuery, page: "1" });
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    updateURL({ status: status === "all" ? "" : status, page: "1" });
  };

  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateURL = (params: Record<string, string>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });
    router.push(`/admin-new/images?${current.toString()}`);
  };

  const handleCopyUrl = (hash: string) => {
    const url = `${window.location.origin}/${hash}`;
    navigator.clipboard.writeText(url);
    alert("網址已複製到剪貼簿");
  };

  const handleSelectImage = (id: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedImages(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map((img) => img.id)));
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小時前`;
    if (minutes > 0) return `${minutes} 分鐘前`;
    return "剛剛";
  };

  const formatFileSize = (url: string) => {
    // TODO: 實際檔案大小需要從 database 獲取
    return "N/A";
  };

  const getFileExtension = (filename: string) => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()?.toLowerCase() : "";
  };

  const handleBatchDelete = async () => {
    if (selectedImages.size === 0) return;

    const confirmed = confirm(
      `確定要刪除選中的 ${selectedImages.size} 張圖片嗎？此操作無法撤銷！`
    );
    if (!confirmed) return;

    try {
      const response = await fetch("/api/admin/mappings/batch", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedImages),
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`成功刪除 ${data.data.deletedCount} 張圖片`);
        setSelectedImages(new Set());
        loadImages();
      } else {
        alert(`刪除失敗: ${data.error}`);
      }
    } catch (error) {
      console.error("批量刪除失敗:", error);
      alert("批量刪除失敗");
    }
  };

  const handleBatchOperation = async (operation: string) => {
    if (selectedImages.size === 0) return;

    setBatchOperation(operation);
    setShowBatchMenu(true);
  };

  const executeBatchOperation = async () => {
    if (selectedImages.size === 0) return;

    let requestBody: any = {
      ids: Array.from(selectedImages),
      operation: batchOperation,
    };

    if (batchOperation === "setPassword") {
      if (!batchPassword.trim()) {
        alert("請輸入密碼");
        return;
      }
      requestBody.password = batchPassword.trim();
    } else if (batchOperation === "setExpiry") {
      requestBody.expiresAt = batchExpiry || null;
    }

    try {
      const response = await fetch("/api/admin/mappings/batch", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setSelectedImages(new Set());
        setShowBatchMenu(false);
        setBatchPassword("");
        setBatchExpiry("");
        loadImages();
      } else {
        alert(`操作失敗: ${data.error}`);
      }
    } catch (error) {
      console.error("批量操作失敗:", error);
      alert("批量操作失敗");
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
        <button onClick={loadImages} className={styles.retryButton}>
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
          <h1 className={styles.pageTitle}>圖片管理</h1>
          <p className={styles.pageSubtitle}>
            共 {pagination.total.toLocaleString()} 張圖片
          </p>
        </div>
        <div className={styles.topBarActions}>
          {selectedImages.size > 0 && (
            <span className={imgStyles.selectedCount}>
              已選擇 {selectedImages.size} 項
            </span>
          )}
          <button onClick={loadImages} className={styles.refreshButton}>
            🔄 刷新
          </button>
        </div>
      </div>

      {/* Batch Operations Toolbar */}
      {selectedImages.size > 0 && (
        <div className={imgStyles.batchToolbar}>
          <button
            onClick={handleBatchDelete}
            className={imgStyles.batchButton}
            style={{ background: "#dc2626" }}
          >
            🗑️ 刪除 ({selectedImages.size})
          </button>
          <button
            onClick={() => handleBatchOperation("setPassword")}
            className={imgStyles.batchButton}
          >
            🔒 設置密碼
          </button>
          <button
            onClick={() => handleBatchOperation("clearPassword")}
            className={imgStyles.batchButton}
          >
            🔓 清除密碼
          </button>
          <button
            onClick={() => handleBatchOperation("setExpiry")}
            className={imgStyles.batchButton}
          >
            ⏰ 設置過期
          </button>
          <button
            onClick={() => setSelectedImages(new Set())}
            className={imgStyles.cancelButton}
          >
            取消選擇
          </button>
        </div>
      )}

      {/* Filters */}
      <div className={imgStyles.filterBar}>
        <form onSubmit={handleSearch} className={imgStyles.searchForm}>
          <input
            type="text"
            placeholder="搜尋檔名..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={imgStyles.searchInput}
          />
          <button type="submit" className={imgStyles.searchButton}>
            🔍 搜尋
          </button>
        </form>

        <div className={imgStyles.statusFilters}>
          <button
            onClick={() => handleStatusFilter("all")}
            className={`${imgStyles.filterButton} ${
              statusFilter === "all" ? imgStyles.active : ""
            }`}
          >
            全部
          </button>
          <button
            onClick={() => handleStatusFilter("valid")}
            className={`${imgStyles.filterButton} ${
              statusFilter === "valid" ? imgStyles.active : ""
            }`}
          >
            有效
          </button>
          <button
            onClick={() => handleStatusFilter("expired")}
            className={`${imgStyles.filterButton} ${
              statusFilter === "expired" ? imgStyles.active : ""
            }`}
          >
            已過期
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: "50px" }}>
                <input
                  type="checkbox"
                  checked={selectedImages.size === images.length && images.length > 0}
                  onChange={handleSelectAll}
                  className={imgStyles.checkbox}
                />
              </th>
              <th style={{ width: "60px" }}>預覽</th>
              <th style={{ width: "200px" }}>檔名</th>
              <th style={{ width: "100px" }}>短鏈</th>
              <th style={{ width: "120px" }}>原始 URL</th>
              <th style={{ width: "100px" }}>密碼</th>
              <th style={{ width: "140px" }}>上傳時間</th>
              <th style={{ width: "80px" }}>狀態</th>
              <th style={{ width: "160px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {images.map((image) => (
              <tr key={image.id}>
                <td data-label="選擇">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.id)}
                    onChange={() => handleSelectImage(image.id)}
                    className={imgStyles.checkbox}
                  />
                </td>
                <td data-label="預覽">
                  <div className={imgStyles.thumbnail}>
                    <img
                      src={image.url}
                      alt={image.filename}
                      loading="lazy"
                    />
                  </div>
                </td>
                <td
                  className={styles.fileName}
                  data-label="檔名"
                  title={image.filename}
                >
                  {image.filename}
                </td>
                <td data-label="短鏈">
                  <a
                    href={`/${image.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.hashLink}
                  >
                    /{image.hash}
                  </a>
                </td>
                <td data-label="原始 URL" title={image.url}>
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.hashLink}
                    style={{ fontSize: "12px" }}
                  >
                    {image.url.length > 20 ? `${image.url.substring(0, 20)}...` : image.url}
                  </a>
                </td>
                <td data-label="密碼">
                  {image.password ? (
                    <span className={imgStyles.passwordValue}>
                      {image.password}
                    </span>
                  ) : (
                    <span style={{ color: "#99a0ab" }}>無</span>
                  )}
                </td>
                <td data-label="上傳時間">{formatTime(image.createdAt)}</td>
                <td data-label="狀態">
                  <div className={styles.statusBadges}>
                    {image.hasPassword && (
                      <span className={imgStyles.statusBadge} title="有密碼保護">
                        🔒
                      </span>
                    )}
                    {image.isExpired && (
                      <span className={imgStyles.statusBadge} title="已過期">
                        ⏰
                      </span>
                    )}
                    {!image.hasPassword && !image.isExpired && (
                      <span className={imgStyles.statusBadge} title="正常">
                        ✅
                      </span>
                    )}
                  </div>
                </td>
                <td data-label="操作">
                  <div className={styles.actions}>
                    <button
                      onClick={() => handleCopyUrl(image.hash)}
                      className={styles.actionButton}
                      title="複製連結"
                    >
                      複製
                    </button>
                    <button
                      onClick={() =>
                        window.open(`/${image.hash}`, "_blank")
                      }
                      className={styles.actionButton}
                      title="在新分頁開啟"
                    >
                      預覽
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/admin-new/images/${image.hash}`)
                      }
                      className={styles.actionButton}
                      title="查看詳情"
                    >
                      詳情
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {images.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>
                  暫無圖片記錄
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className={imgStyles.pagination}>
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className={imgStyles.pageButton}
          >
            上一頁
          </button>

          <div className={imgStyles.pageNumbers}>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((page) => {
                const current = pagination.page;
                return (
                  page === 1 ||
                  page === pagination.totalPages ||
                  (page >= current - 2 && page <= current + 2)
                );
              })
              .map((page, index, array) => {
                const showEllipsis =
                  index > 0 && array[index - 1] !== page - 1;
                return (
                  <div key={page}>
                    {showEllipsis && (
                      <span className={imgStyles.ellipsis}>...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`${imgStyles.pageButton} ${
                        page === pagination.page ? imgStyles.active : ""
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className={imgStyles.pageButton}
          >
            下一頁
          </button>
        </div>
      )}

      {/* Batch Operation Modal */}
      {showBatchMenu && (
        <div className={imgStyles.modalOverlay} onClick={() => setShowBatchMenu(false)}>
          <div className={imgStyles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={imgStyles.modalTitle}>
              {batchOperation === "setPassword" && "批量設置密碼"}
              {batchOperation === "clearPassword" && "批量清除密碼"}
              {batchOperation === "setExpiry" && "批量設置過期時間"}
            </h3>
            <p className={imgStyles.modalDescription}>
              將對 {selectedImages.size} 張圖片執行此操作
            </p>

            {batchOperation === "setPassword" && (
              <div className={imgStyles.modalForm}>
                <label className={imgStyles.modalLabel}>新密碼</label>
                <input
                  type="text"
                  value={batchPassword}
                  onChange={(e) => setBatchPassword(e.target.value)}
                  className={imgStyles.modalInput}
                  placeholder="輸入密碼"
                  autoFocus
                />
              </div>
            )}

            {batchOperation === "setExpiry" && (
              <div className={imgStyles.modalForm}>
                <label className={imgStyles.modalLabel}>過期時間</label>
                <input
                  type="datetime-local"
                  value={batchExpiry}
                  onChange={(e) => setBatchExpiry(e.target.value)}
                  className={imgStyles.modalInput}
                />
                <p className={imgStyles.modalHint}>留空表示永不過期</p>
              </div>
            )}

            {batchOperation === "clearPassword" && (
              <p className={imgStyles.modalWarning}>
                將清除所有選中圖片的密碼保護
              </p>
            )}

            <div className={imgStyles.modalActions}>
              <button
                onClick={executeBatchOperation}
                className={imgStyles.modalConfirm}
              >
                確認執行
              </button>
              <button
                onClick={() => {
                  setShowBatchMenu(false);
                  setBatchPassword("");
                  setBatchExpiry("");
                }}
                className={imgStyles.modalCancel}
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
