/**
 * 圖片映射相關型別定義
 * 統一管理所有與圖片/檔案映射相關的型別
 */

/**
 * 基礎映射型別 - 對應 Prisma schema
 * 用於後端和資料庫操作
 */
export interface BaseMapping {
  id: string;
  hash: string;
  url: string;
  filename: string;
  shortUrl: string;
  fileExtension: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  password: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
}

/**
 * 客戶端映射型別
 * 用於前端顯示，日期為 ISO string 格式
 */
export interface ClientMapping {
  hash: string;
  url: string;
  filename: string;
  shortUrl: string;
  fileExtension?: string | null;
  createdAt: string; // ISO String
  expiresAt?: string | null; // ISO String
  hasPassword?: boolean;
  password?: string | null; // 舊格式支援
}

/**
 * Admin 圖片項目型別
 * 用於管理後台的圖片列表
 */
export interface AdminImageItem {
  id: string;
  hash: string;
  filename: string;
  url: string;
  shortUrl: string;
  createdAt: string; // ISO String
  expiresAt: string | null;
  isExpired: boolean;
  hasPassword: boolean;
  password: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
}

/**
 * Admin 映射項目（Dashboard 用）
 * 簡化版的 Admin 圖片項目
 */
export interface AdminMappingItem {
  id: string;
  hash: string;
  filename: string;
  url: string;
  shortUrl: string;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  hasPassword: boolean;
}

/**
 * 時間軸項目型別
 * 用於活動時間軸顯示
 */
export interface TimelineItem {
  id: string;
  hash: string;
  filename: string;
  url: string;
  createdAt: string;
  hasPassword: boolean;
  isExpired: boolean;
}

/**
 * 上傳項目型別
 * 用於前端上傳佇列管理
 */
export interface UploadItem {
  id: string;
  file: File;
  done: boolean;
  url: string | null;
  shortUrl?: string;
  progress: number;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
}

/**
 * LocalStorage 儲存的圖片型別
 */
export interface StoredImage {
  id: string; // HASH 值
  filename: string;
  url: string;
  shortUrl: string;
  createdAt: Date;
  expiresAt?: Date;
  password?: string;
}
