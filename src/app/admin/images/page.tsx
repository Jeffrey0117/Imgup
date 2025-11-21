"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

type StatusFilter = "all" | "valid" | "expired" | "deleted";
type PwFilter = "all" | "protected" | "unprotected";

interface MappingRow {
  id: string;
  hash: string;
  filename: string;
  url: string | null;
  shortUrl: string;
  createdAt: string; // ISO
  expiresAt: string | null; // ISO
  viewCount: number;
  isDeleted: boolean;
  deletedAt: string | null;
  isExpired: boolean;
  hasPassword: boolean;
  password: string | null;
}

// 統計概覽介面
interface StatsOverview {
  summary: {
    totalViews: number;
    todayViews: number;
    redisConnected: boolean;
    pendingSyncCount: number;
  };
  topImages: Array<{
    hash: string;
    filename: string;
    viewCount: number;
    createdAt: string;
  }>;
  topReferrers: Array<{
    domain: string;
    count: number;
  }>;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AdminImagesPage() {
  const router = useRouter();

  // Auth
  const [authChecked, setAuthChecked] = useState(false);

  // Stats overview state
  const [statsOverview, setStatsOverview] = useState<StatsOverview | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  // List state
  const [items, setItems] = useState<MappingRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pwFilter, setPwFilter] = useState<PwFilter>("all");
  const [minViews, setMinViews] = useState<string>("");
  const [maxViews, setMaxViews] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");

  // Advanced filters panel
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MappingRow | null>(null);
  const [editFilename, setEditFilename] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState<string>(""); // datetime-local
  const [editPwEnabled, setEditPwEnabled] = useState(false);
  const [editPassword, setEditPassword] = useState("");

  // Copy state for original URL (per row by id)
  const [copyState, setCopyState] = useState<
    Record<string, "idle" | "copied" | "error">
  >({});

  // Export state
  const [exporting, setExporting] = useState(false);

  // Batch selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAllState, setSelectAllState] = useState<"none" | "some" | "all">("none");

  // Real-time stats refresh
  const [statsInterval, setStatsInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // verify admin
    (async () => {
      try {
        const res = await fetch("/api/admin/auth/verify", {
          credentials: "include",
        });
        if (!res.ok) {
          router.push("/admin/login");
          return;
        }
        setAuthChecked(true);
      } catch {
        router.push("/admin/login");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    loadStatsOverview();
    loadList(1);
    // Clear selection when page loads
    clearSelection();

    // Set up real-time stats refresh (every 30 seconds)
    const interval = setInterval(() => {
      loadStatsOverview();
    }, 30000);
    setStatsInterval(interval);

    // Cleanup interval on unmount
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked]);

  const buildQuery = (page: number) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pagination.pageSize));
    params.set("includeStats", "true"); // 啟用統計資訊

    if (search.trim()) params.set("search", search.trim());

    // Date range: expect yyyy-mm-dd
    if (dateStart) params.set("dateStart", dateStart);
    if (dateEnd) params.set("dateEnd", dateEnd);

    if (status !== "all") params.set("status", status);

    if (pwFilter !== "all") {
      params.set(
        "passwordProtected",
        pwFilter === "protected" ? "true" : "false"
      );
    }

    if (minViews.trim()) params.set("minViews", minViews.trim());
    if (maxViews.trim()) params.set("maxViews", maxViews.trim());
    if (fileType.trim()) params.set("fileType", fileType.trim());

    return params.toString();
  };

  async function loadStatsOverview() {
    try {
      setStatsLoading(true);
      setStatsError("");

      const res = await fetch("/api/admin/tracking/stats?overview=true", {
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "載入統計概覽失敗");
      }

      setStatsOverview(json.data);
    } catch (e: any) {
      setStatsError(e.message || "載入統計概覽失敗");
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadList(page: number) {
    try {
      setLoading(true);
      setError("");

      const qs = buildQuery(page);
      const res = await fetch(`/api/admin/mappings?${qs}`, {
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "載入失敗");
      }

      setItems(json.data.items);
      setPagination(json.data.pagination);

      // Update select all state after loading new items
      updateSelectAllState(selectedItems);
    } catch (e: any) {
      setError(e.message || "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  // Batch selection functions
  function toggleItemSelection(itemId: string) {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      updateSelectAllState(newSet);
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectAllState === "all") {
      setSelectedItems(new Set());
      setSelectAllState("none");
    } else {
      const newSet = new Set(items.map(item => item.id));
      setSelectedItems(newSet);
      setSelectAllState("all");
    }
  }

  function updateSelectAllState(selectedSet: Set<string>) {
    const currentPageItemIds = new Set(items.map(item => item.id));
    const selectedOnCurrentPage = new Set(
      Array.from(selectedSet).filter(id => currentPageItemIds.has(id))
    );

    if (selectedOnCurrentPage.size === 0) {
      setSelectAllState("none");
    } else if (selectedOnCurrentPage.size === items.length) {
      setSelectAllState("all");
    } else {
      setSelectAllState("some");
    }
  }

  function clearSelection() {
    setSelectedItems(new Set());
    setSelectAllState("none");
  }

  async function handleBatchPasswordSet(password: string) {
    try {
      const ids = Array.from(selectedItems);
      const operation = password.trim() === "" ? "clearPassword" : "setPassword";

      const res = await fetch("/api/admin/mappings/batch", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids,
          operation,
          password: operation === "setPassword" ? password.trim() : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "批量設定密碼失敗");
      }

      alert(`成功更新 ${json.data.updatedCount} 個項目的密碼`);
      clearSelection();
      loadList(pagination.page);
    } catch (error: any) {
      alert(error.message || "批量設定密碼失敗");
    }
  }

  async function handleExport(format: "csv" | "excel") {
    try {
      setExporting(true);

      const res = await fetch(`/api/admin/export?format=${format}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "匯出失敗");
      }

      // 觸發檔案下載
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mappings_export_${new Date().toISOString().split('T')[0]}.${format === "excel" ? "xlsx" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert(`✅ ${format.toUpperCase()} 匯出成功`);
    } catch (error: any) {
      alert(`❌ 匯出失敗: ${error.message}`);
    } finally {
      setExporting(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setDateStart("");
    setDateEnd("");
    setStatus("all");
    setPwFilter("all");
    setMinViews("");
    setMaxViews("");
    setFileType("");
    setShowAdvancedFilters(false);
    // Clear selection when filters are reset
    clearSelection();
  }

  function formatDateTime(iso: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${da} ${hh}:${mm}`;
  }

  function toDatetimeLocalValue(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${da}T${hh}:${mm}`;
  }

  function fromDatetimeLocalValue(val: string) {
    if (!val) return null;
    // val: yyyy-MM-ddTHH:mm
    const dt = new Date(val);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  function statusTags(row: MappingRow) {
    const tags: { label: string; type: "green" | "orange" | "red" }[] = [];
    if (row.hasPassword) tags.push({ label: "🔒 保護", type: "green" });
    if (row.isExpired) tags.push({ label: "⏰ 到期", type: "orange" });
    if (row.isDeleted) tags.push({ label: "🗑 已刪", type: "red" });
    return tags;
  }

  function copyShort(hash: string) {
    const url = `${window.location.origin}/${hash}`;
    navigator.clipboard.writeText(url);
    alert("短網址已複製");
  }

  async function copyOriginalUrl(row: MappingRow) {
    try {
      if (!row.url) {
        setCopyState((s) => ({ ...s, [row.id]: "error" }));
        setTimeout(
          () => setCopyState((s) => ({ ...s, [row.id]: "idle" })),
          1500
        );
        return;
      }
      await navigator.clipboard.writeText(row.url);
      setCopyState((s) => ({ ...s, [row.id]: "copied" }));
      setTimeout(() => setCopyState((s) => ({ ...s, [row.id]: "idle" })), 1500);
    } catch {
      setCopyState((s) => ({ ...s, [row.id]: "error" }));
      setTimeout(() => setCopyState((s) => ({ ...s, [row.id]: "idle" })), 1500);
    }
  }

  async function softDelete(hash: string) {
    if (!confirm("確定要刪除此檔案（軟刪除）？")) return;
    const res = await fetch(`/api/admin/mappings/${hash}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      alert("刪除成功");
      loadList(pagination.page);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "刪除失敗");
    }
  }

  function openEdit(row: MappingRow) {
    setEditing(row);
    setEditFilename(row.filename);
    setEditExpiresAt(toDatetimeLocalValue(row.expiresAt));
    setEditPwEnabled(row.hasPassword);
    setEditPassword(""); // 預設不顯示舊密碼
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;

    // 準備 payload
    const payload: any = {
      filename: editFilename.trim(),
    };

    // expiresAt
    if (editExpiresAt === "") {
      payload.expiresAt = null;
    } else {
      const iso = fromDatetimeLocalValue(editExpiresAt);
      if (!iso) {
        alert("過期時間格式錯誤");
        return;
      }
      payload.expiresAt = iso;
    }

    // password
    if (!editPwEnabled) {
      payload.removePassword = true;
    } else {
      // 設定密碼（允許空值則會被視為移除）
      payload.password = editPassword;
    }

    const res = await fetch(`/api/admin/mappings/${editing.hash}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.success) {
      alert(json.error || "更新失敗");
      return;
    }

    // 更新列表中的該筆資料（後端 PUT 回傳未必包含 password/url，故以原資料為基底合併）
    const updatedPartial = json.data as Partial<MappingRow> & { id: string };
    setItems((prev) =>
      prev.map((x) =>
        x.id === updatedPartial.id
          ? ({ ...x, ...updatedPartial } as MappingRow)
          : x
      )
    );
    setEditOpen(false);
  }

  const isFiltering = useMemo(() => {
    return (
      search.trim() !== "" ||
      dateStart !== "" ||
      dateEnd !== "" ||
      status !== "all" ||
      pwFilter !== "all" ||
      minViews.trim() !== "" ||
      maxViews.trim() !== "" ||
      fileType.trim() !== ""
    );
  }, [search, dateStart, dateEnd, status, pwFilter, minViews, maxViews, fileType]);

  if (!authChecked) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>驗證中...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Stats Overview Cards */}
      <div className={styles.statsOverview}>
        {statsLoading ? (
          <div className={styles.statsLoading}>載入統計中...</div>
        ) : statsError ? (
          <div className={styles.statsError}>{statsError}</div>
        ) : statsOverview ? (
          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{statsOverview.summary.totalViews.toLocaleString()}</div>
              <div className={styles.statLabel}>總瀏覽次數</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{statsOverview.summary.todayViews.toLocaleString()}</div>
              <div className={styles.statLabel}>今日瀏覽次數</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {statsOverview.summary.redisConnected ? "🟢" : "🔴"} {statsOverview.summary.pendingSyncCount}
              </div>
              <div className={styles.statLabel}>Redis 狀態 / 待同步</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.brand}>
          <Image
            src="/new_logo_with_text.png"
            alt="duk.tw Logo"
            className={styles.logo}
            width={36}
            height={36}
            priority
          />
          <h1 className={styles.title}>
            圖片管理 <span className={styles.brandTag}>Images</span>
          </h1>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.exportGroup}>
            <span className={styles.exportLabel}>匯出：</span>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => handleExport("csv")}
              disabled={exporting}
              title="匯出為 CSV 檔案"
            >
              {exporting ? "匯出中..." : "📄 CSV"}
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => handleExport("excel")}
              disabled={exporting}
              title="匯出為 Excel 檔案"
            >
              {exporting ? "匯出中..." : "📊 Excel"}
            </button>
          </div>
          <button
            className={styles.button}
            onClick={() => router.push("/admin")}
          >
            返回 Dashboard
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersGrid}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>檔名搜尋</label>
            <input
              className={styles.input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="輸入檔名關鍵字"
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>開始日期</label>
            <input
              type="date"
              className={styles.input}
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>結束日期</label>
            <input
              type="date"
              className={styles.input}
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>狀態</label>
            <select
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            >
              <option value="all">全部</option>
              <option value="valid">有效</option>
              <option value="expired">已過期</option>
              <option value="deleted">已刪除</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>密碼保護</label>
            <select
              className={styles.select}
              value={pwFilter}
              onChange={(e) => setPwFilter(e.target.value as PwFilter)}
            >
              <option value="all">全部</option>
              <option value="protected">已保護</option>
              <option value="unprotected">未保護</option>
            </select>
          </div>

          <div className={styles.filterActions}>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? "隱藏" : "顯示"} 進階篩選
            </button>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => loadList(1)}
            >
              套用
            </button>
            <button
              className={`${styles.button} ${styles.buttonGhost}`}
              disabled={!isFiltering}
              onClick={() => {
                resetFilters();
                // after reset, reload
                setTimeout(() => loadList(1), 0);
              }}
            >
              重置
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className={styles.advancedFilters}>
            <div className={styles.filtersGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.label}>最低瀏覽數</label>
                <input
                  type="number"
                  className={styles.input}
                  value={minViews}
                  onChange={(e) => setMinViews(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.label}>最高瀏覽數</label>
                <input
                  type="number"
                  className={styles.input}
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  placeholder="無上限"
                  min="0"
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.label}>檔案類型</label>
                <select
                  className={styles.select}
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                >
                  <option value="">全部</option>
                  <option value="jpg">JPG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="gif">GIF</option>
                  <option value="webp">WEBP</option>
                  <option value="svg">SVG</option>
                  <option value="pdf">PDF</option>
                  <option value="txt">TXT</option>
                  <option value="zip">ZIP</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {isFiltering && (
        <div className={styles.resultsSummary}>
          <span>篩選結果：共 {pagination.total} 筆資料</span>
          {pagination.total > 0 && (
            <button
              className={styles.clearFiltersButton}
              onClick={() => {
                resetFilters();
                setTimeout(() => loadList(1), 0);
              }}
            >
              清除篩選
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className={styles.panel}>
        {/* Batch Selection Bar */}
        {selectedItems.size > 0 && (
          <div className={styles.batchSelectionBar}>
            <div className={styles.selectionInfo}>
              已選取 {selectedItems.size} 項
            </div>
            <div className={styles.batchActions}>
              <button
                className={`${styles.button} ${styles.buttonDanger}`}
                onClick={async () => {
                  if (confirm(`確定要刪除已選取的 ${selectedItems.size} 項？此操作不可逆！`)) {
                    try {
                      const ids = Array.from(selectedItems);
                      const res = await fetch("/api/admin/mappings/batch", {
                        method: "DELETE",
                        credentials: "include",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ ids }),
                      });

                      const json = await res.json();

                      if (!res.ok || !json.success) {
                        throw new Error(json.error || "批量刪除失敗");
                      }

                      alert(`成功刪除 ${json.data.deletedCount} 個項目`);
                      clearSelection();
                      loadList(pagination.page);
                    } catch (error: any) {
                      alert(error.message || "批量刪除失敗");
                    }
                  }
                }}
              >
                批量刪除
              </button>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => {
                  const password = prompt("請輸入要設定的密碼（留空則清除密碼保護）:");
                  if (password !== null) {
                    handleBatchPasswordSet(password);
                  }
                }}
              >
                批量設定密碼
              </button>
              <button
                className={`${styles.button} ${styles.buttonGhost}`}
                onClick={clearSelection}
              >
                清除選取
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>載入中...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.checkboxColumn}>
                      <input
                        type="checkbox"
                        checked={selectAllState === "all"}
                        ref={(checkbox) => {
                          if (checkbox) {
                            checkbox.indeterminate = selectAllState === "some";
                          }
                        }}
                        onChange={toggleSelectAll}
                        title={
                          selectAllState === "all"
                            ? "取消全選"
                            : "全選此頁"
                        }
                      />
                    </th>
                    <th>預覽</th>
                    <th>檔名</th>
                    <th>短鏈</th>
                    <th>原始 URL</th>
                    <th>密碼</th>
                    <th>上傳時間</th>
                    <th>狀態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td className={styles.empty} colSpan={9}>
                        沒有資料
                      </td>
                    </tr>
                  )}
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td className={styles.checkboxColumn} data-label="選取">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(row.id)}
                          onChange={() => toggleItemSelection(row.id)}
                          title={selectedItems.has(row.id) ? "取消選取" : "選取此項"}
                        />
                      </td>
                      <td className={styles.previewCell} data-label="預覽">
                        <img
                          className={styles.preview}
                          src={row.url || ""}
                          alt={row.filename}
                          referrerPolicy="no-referrer"
                        />
                      </td>
                      <td
                        className={styles.fileName}
                        data-label="檔名"
                        title={row.filename}
                      >
                        {row.filename}
                      </td>
                      <td data-label="短鏈">
                        <a
                          href={`/${row.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.hashLink}
                          title={row.shortUrl || `/${row.hash}`}
                        >
                          /{row.hash}
                        </a>
                      </td>
                      <td className={styles.urlCell} data-label="原始 URL">
                        {row.url ? (
                          <div className={styles.urlWrap} title={row.url}>
                            <span className={styles.urlText}>{row.url}</span>
                            <button
                              className={styles.copyButton}
                              onClick={() => copyOriginalUrl(row)}
                              aria-label="複製原始 URL"
                              title="複製原始 URL"
                            >
                              {copyState[row.id] === "copied"
                                ? "已複製"
                                : copyState[row.id] === "error"
                                ? "複製失敗"
                                : "複製"}
                            </button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="密碼">
                        {row.password ? row.password : "—"}
                      </td>
                      <td data-label="上傳時間">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td data-label="狀態">
                        {statusTags(row).map((t, i) => (
                          <span
                            key={i}
                            className={`${styles.tag} ${
                              t.type === "green"
                                ? styles.tagGreen
                                : t.type === "orange"
                                ? styles.tagOrange
                                : styles.tagRed
                            }`}
                          >
                            {t.label}
                          </span>
                        ))}
                      </td>
                      <td data-label="操作">
                        <div className={styles.actions}>
                          <button
                            className={styles.actionButton}
                            onClick={() => copyShort(row.hash)}
                          >
                            複製
                          </button>
                          <button
                            className={styles.actionButton}
                            onClick={() =>
                              window.open(`/${row.hash}.jpg`, "_blank")
                            }
                          >
                            檢視
                          </button>
                          <button
                            className={styles.actionButton}
                            onClick={() => openEdit(row)}
                          >
                            編輯
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.danger}`}
                            onClick={() => softDelete(row.hash)}
                            disabled={row.isDeleted}
                            title={row.isDeleted ? "已刪除" : "軟刪除"}
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <div className={styles.pageInfo}>
                第 {pagination.page} / {pagination.totalPages} 頁，共{" "}
                {pagination.total} 筆
              </div>
              <div className={styles.pageControls}>
                <button
                  className={styles.button}
                  disabled={pagination.page <= 1}
                  onClick={() => loadList(1)}
                >
                  ⏮ 第一頁
                </button>
                <button
                  className={styles.button}
                  disabled={pagination.page <= 1}
                  onClick={() => loadList(pagination.page - 1)}
                >
                  ◀ 上一頁
                </button>
                <button
                  className={styles.button}
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadList(pagination.page + 1)}
                >
                  下一頁 ▶
                </button>
                <button
                  className={styles.button}
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadList(pagination.totalPages)}
                >
                  末頁 ⏭
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && editing && (
        <div className={styles.modalOverlay} onClick={() => setEditOpen(false)}>
          <div
            className={styles.modal}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>編輯檔案</h3>
              <button
                className={styles.closeButton}
                onClick={() => setEditOpen(false)}
              >
                關閉
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formRow}>
                <label className={styles.label}>檔名</label>
                <input
                  className={styles.input}
                  value={editFilename}
                  onChange={(e) => setEditFilename(e.target.value)}
                  placeholder="請輸入檔名"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>過期時間</label>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                />
                <div className={styles.hint}>留空表示不設定過期</div>
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>
                  密碼保護
                  <input
                    type="checkbox"
                    style={{ marginLeft: 8 }}
                    checked={editPwEnabled}
                    onChange={(e) => setEditPwEnabled(e.target.checked)}
                  />
                </label>
                <input
                  className={styles.input}
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="輸入新密碼（留空不變更；取消勾選以移除）"
                  disabled={!editPwEnabled}
                />
                <div className={styles.hint}>
                  取消勾選將移除密碼保護；勾選後留空密碼也視為移除。
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.button}
                onClick={() => setEditOpen(false)}
              >
                取消
              </button>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={saveEdit}
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}