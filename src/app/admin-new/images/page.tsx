"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import styles from "../dashboard.module.css";
import imgStyles from "./images.module.css";
import AlbumModal from "../albums/components/AlbumModal";
import BatchAlbumSelector from "./components/BatchAlbumSelector";

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
  const toast = useToast();
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
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pwFilter, setPwFilter] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectedImageHashes, setSelectedImageHashes] = useState<Map<string, string>>(new Map()); // id -> hash 映射
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [batchOperation, setBatchOperation] = useState<string>("");
  const [batchPassword, setBatchPassword] = useState("");
  const [batchExpiry, setBatchExpiry] = useState("");
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string>("");
  const [showBatchAlbumModal, setShowBatchAlbumModal] = useState(false);
  const [hoveredImage, setHoveredImage] = useState<ImageItem | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadImages();
  }, [searchParams]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = parseInt(searchParams.get("pageSize") || "20");

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchQuery) params.append("search", searchQuery);
      if (dateStart) params.append("dateStart", dateStart);
      if (dateEnd) params.append("dateEnd", dateEnd);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (pwFilter && pwFilter !== "all") params.append("pwFilter", pwFilter);

      const response = await fetch(`/api/admin/mappings?${params}`, {
        credentials: "include",
      });

      // 檢查是否未授權
      if (response.status === 401) {
        router.push("/admin-new/login");
        return;
      }

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

  const handleApplyFilters = () => {
    loadImages();
  };

  const resetFilters = () => {
    setSearchQuery("");
    setDateStart("");
    setDateEnd("");
    setStatusFilter("all");
    setPwFilter("all");
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
    toast.success("網址已複製到剪貼簿");
  };

  const handleFavorite = (imageId: string) => {
    setSelectedImageId(imageId);
    setShowAlbumModal(true);
  };

  const handleBatchFavorite = () => {
    if (selectedImages.size === 0) return;
    setShowBatchAlbumModal(true);
  };

  const handleBatchCopyUrls = () => {
    if (selectedImages.size === 0) return;

    // 使用 selectedImageHashes Map 來獲取所有選中圖片的 hash（已包含副檔名）
    const selectedUrls = Array.from(selectedImageHashes.values())
      .map(hashWithExt => `${window.location.origin}/${hashWithExt}`)
      .join('\n');

    navigator.clipboard.writeText(selectedUrls);
    toast.success(`已複製 ${selectedImages.size} 個網址到剪貼簿`);
  };

  const handleImageHover = (image: ImageItem | null, event?: React.MouseEvent) => {
    setHoveredImage(image);
    if (event && image) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredImage) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleSelectImage = (id: string, index: number, event?: React.MouseEvent) => {
    const newSelected = new Set(selectedImages);
    const newHashes = new Map(selectedImageHashes);

    // Shift 連續選取
    if (event?.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);

      // 選取範圍內所有圖片
      for (let i = start; i <= end; i++) {
        const img = images[i];
        const ext = getFileExtension(img.filename);
        const hashWithExt = ext ? `${img.hash}.${ext}` : img.hash;
        newSelected.add(img.id);
        newHashes.set(img.id, hashWithExt); // 記錄 hash + 副檔名
      }
      setSelectedImages(newSelected);
      setSelectedImageHashes(newHashes);
      setLastClickedIndex(index);
    } else {
      // 單個選取/取消
      if (newSelected.has(id)) {
        newSelected.delete(id);
        newHashes.delete(id); // 同步刪除 hash
      } else {
        const image = images[index];
        const ext = getFileExtension(image.filename);
        const hashWithExt = ext ? `${image.hash}.${ext}` : image.hash;
        newSelected.add(id);
        newHashes.set(id, hashWithExt); // 記錄 hash + 副檔名
      }
      setSelectedImages(newSelected);
      setSelectedImageHashes(newHashes);
      setLastClickedIndex(index);
    }
  };

  const handleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
      setSelectedImageHashes(new Map());
    } else {
      const newSelected = new Set(images.map((img) => img.id));
      const newHashes = new Map(
        images.map((img) => {
          const ext = getFileExtension(img.filename);
          const hashWithExt = ext ? `${img.hash}.${ext}` : img.hash;
          return [img.id, hashWithExt];
        })
      );
      setSelectedImages(newSelected);
      setSelectedImageHashes(newHashes);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    // 24 小時內：顯示相對時間
    if (hours < 24) {
      const minutes = Math.floor(diff / (1000 * 60));
      if (hours > 0) return `${hours} 小時前`;
      if (minutes > 0) return `${minutes} 分鐘前`;
      return "剛剛";
    }

    // 超過 24 小時：顯示完整日期 + 時間
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
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
        toast.success(`成功刪除 ${data.data.deletedCount} 張圖片`);
        setSelectedImages(new Set());
        setSelectedImageHashes(new Map());
        loadImages();
      } else {
        toast.error(`刪除失敗: ${data.error}`);
      }
    } catch (error) {
      console.error("批量刪除失敗:", error);
      toast.error("批量刪除失敗");
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
        toast.warning("請輸入密碼");
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
        toast.success(data.message);
        setSelectedImages(new Set());
        setSelectedImageHashes(new Map());
        setShowBatchMenu(false);
        setBatchPassword("");
        setBatchExpiry("");
        loadImages();
      } else {
        toast.error(`操作失敗: ${data.error}`);
      }
    } catch (error) {
      console.error("批量操作失敗:", error);
      toast.error("批量操作失敗");
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
    const isUnauthorized = error.includes("未授權") || error.includes("Unauthorized");

    return (
      <div className={styles.errorContainer}>
        <h3>載入失敗</h3>
        <p>{error}</p>
        {isUnauthorized ? (
          <button
            onClick={() => router.push("/admin-new/login")}
            className={styles.retryButton}
          >
            前往登入
          </button>
        ) : (
          <button onClick={loadImages} className={styles.retryButton}>
            重新載入
          </button>
        )}
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
            onClick={handleBatchCopyUrls}
            className={imgStyles.batchButton}
            style={{ background: "rgba(88, 194, 88, 0.3)", borderColor: "rgba(88, 194, 88, 0.6)" }}
          >
            📋 複製網址 ({selectedImages.size})
          </button>
          <button
            onClick={handleBatchFavorite}
            className={imgStyles.batchButton}
            style={{ background: "rgba(255, 204, 0, 0.3)", borderColor: "rgba(255, 204, 0, 0.6)" }}
          >
            ⭐ 加入收藏 ({selectedImages.size})
          </button>
          <button
            onClick={handleBatchDelete}
            className={imgStyles.batchButton}
            style={{ background: "#dc2626" }}
          >
            🗑️ 刪除 ({selectedImages.size})
          </button>
          <button
            onClick={() => {
              setSelectedImages(new Set());
              setSelectedImageHashes(new Map());
            }}
            className={imgStyles.cancelButton}
          >
            取消選擇
          </button>
        </div>
      )}

      {/* Filters */}
      <div className={imgStyles.filterBar}>
        <div className={imgStyles.filtersGrid}>
          <div className={imgStyles.filterGroup}>
            <label className={imgStyles.filterLabel}>檔名搜尋</label>
            <input
              type="text"
              className={imgStyles.filterInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="輸入檔名關鍵字"
            />
          </div>

          <div className={imgStyles.filterGroup}>
            <label className={imgStyles.filterLabel}>開始日期</label>
            <input
              type="date"
              className={imgStyles.filterInput}
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>

          <div className={imgStyles.filterGroup}>
            <label className={imgStyles.filterLabel}>結束日期</label>
            <input
              type="date"
              className={imgStyles.filterInput}
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>

          <div className={imgStyles.filterGroup}>
            <label className={imgStyles.filterLabel}>狀態</label>
            <select
              className={imgStyles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="valid">有效</option>
              <option value="expired">已過期</option>
            </select>
          </div>

          <div className={imgStyles.filterGroup}>
            <label className={imgStyles.filterLabel}>密碼保護</label>
            <select
              className={imgStyles.filterSelect}
              value={pwFilter}
              onChange={(e) => setPwFilter(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="protected">已保護</option>
              <option value="unprotected">未保護</option>
            </select>
          </div>

          <div className={imgStyles.filterActions}>
            <button
              onClick={handleApplyFilters}
              className={imgStyles.applyButton}
            >
              套用
            </button>
            <button
              onClick={() => {
                resetFilters();
                setTimeout(loadImages, 0);
              }}
              className={imgStyles.resetButton}
            >
              重置
            </button>
          </div>
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
              <th style={{ width: "50px" }}>預覽</th>
              <th style={{ width: "200px" }}>檔名</th>
              <th style={{ width: "100px" }}>短鏈</th>
              <th style={{ width: "120px" }}>原始 URL</th>
              <th style={{ width: "100px" }}>密碼</th>
              <th style={{ width: "160px" }}>上傳時間</th>
              <th style={{ width: "80px" }}>狀態</th>
              <th style={{ width: "160px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {images.map((image, index) => (
              <tr key={image.id}>
                <td data-label="選擇">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.id)}
                    onChange={() => handleSelectImage(image.id, index)}
                    className={imgStyles.checkbox}
                  />
                </td>
                <td data-label="預覽">
                  <div
                    className={imgStyles.thumbnail}
                    onMouseEnter={(e) => handleImageHover(image, e)}
                    onMouseLeave={() => handleImageHover(null)}
                    onMouseMove={handleMouseMove}
                  >
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
                <td data-label="上傳時間" style={{ whiteSpace: "nowrap" }}>
                  {formatTime(image.createdAt)}
                </td>
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
                      onClick={() => handleFavorite(image.id)}
                      className={styles.actionButton}
                      title="收藏到相簿"
                      style={{ background: "rgba(255, 204, 0, 0.15)", borderColor: "rgba(255, 204, 0, 0.4)" }}
                    >
                      ⭐
                    </button>
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

      {/* Album Modal */}
      {showAlbumModal && selectedImageId && (
        <AlbumModal
          show={showAlbumModal}
          mappingId={selectedImageId}
          onClose={() => {
            setShowAlbumModal(false);
            setSelectedImageId("");
          }}
          onSuccess={() => {
            setShowAlbumModal(false);
            setSelectedImageId("");
          }}
        />
      )}

      {/* Batch Album Modal */}
      {showBatchAlbumModal && (
        <BatchAlbumSelector
          show={showBatchAlbumModal}
          mappingIds={Array.from(selectedImages)}
          onClose={() => setShowBatchAlbumModal(false)}
          onSuccess={() => {
            setShowBatchAlbumModal(false);
            setSelectedImages(new Set());
            setSelectedImageHashes(new Map());
            loadImages();
          }}
        />
      )}

      {/* Floating Image Preview */}
      {hoveredImage && (
        <div
          className={imgStyles.floatingPreview}
          style={{
            left: `${mousePosition.x + 20}px`,
            top: `${mousePosition.y + 20}px`,
          }}
        >
          <img src={hoveredImage.url} alt={hoveredImage.filename} />
          <div className={imgStyles.previewInfo}>
            <div className={imgStyles.previewFilename}>{hoveredImage.filename}</div>
          </div>
        </div>
      )}
    </div>
  );
}
