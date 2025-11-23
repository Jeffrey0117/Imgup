/**
 * 日期格式化工具函數
 * 統一管理所有日期格式化邏輯
 */

/**
 * 格式化為 YYYY-MM-DD 格式
 * @param dateString ISO string 或 Date 物件
 * @returns YYYY-MM-DD 格式的字串
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 格式化為 YYYY-MM-DD HH:mm 格式
 * @param dateString ISO string 或 Date 物件
 * @returns YYYY-MM-DD HH:mm 格式的字串
 */
export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 格式化為本地化完整日期時間（zh-TW）
 * @param dateString ISO string 或 Date 物件
 * @returns 本地化的完整日期時間字串
 */
export function formatFullDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * 格式化為本地化日期（zh-TW，長格式）
 * 用於部落格等需要完整日期的地方
 * @param dateString ISO string 或 Date 物件
 * @returns 本地化的長格式日期字串（例：2024年1月1日）
 */
export function formatLongDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 格式化為本地化簡單日期時間（zh-TW）
 * @param dateString ISO string 或 Date 物件
 * @returns 簡單的本地化日期時間字串
 */
export function formatSimpleDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleString("zh-TW");
}

/**
 * 格式化為相對時間（例：3 分鐘前、2 小時前、5 天前）
 * @param dateString ISO string 或 Date 物件
 * @returns 相對時間字串
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小時前`;
  if (minutes > 0) return `${minutes} 分鐘前`;
  return "剛剛";
}

/**
 * 格式化為智能時間顯示
 * 24 小時內顯示相對時間，超過則顯示完整日期時間
 * @param dateString ISO string 或 Date 物件
 * @returns 智能格式化的時間字串
 */
export function formatSmartTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
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
  return formatDateTime(date);
}

/**
 * 檢查日期是否過期
 * @param expiresAt 過期時間（ISO string、Date 物件或 null）
 * @returns 是否過期
 */
export function isExpired(expiresAt: string | Date | null): boolean {
  if (!expiresAt) return false;
  const expireDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expireDate < new Date();
}

/**
 * 將 Date 物件轉為 ISO string（用於 API 回應）
 * @param date Date 物件
 * @returns ISO string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * 安全地將任意日期格式轉為 ISO string
 * @param date ISO string 或 Date 物件
 * @returns ISO string
 */
export function normalizeToISO(date: string | Date): string {
  return typeof date === "string" ? date : date.toISOString();
}
