/**
 * API 回應相關型別定義
 */

/**
 * 標準 API 回應結構
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 分頁資訊
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 分頁 API 回應
 */
export interface PaginatedApiResponse<T = any> {
  success: boolean;
  data?: {
    items: T[];
    pagination: PaginationInfo;
  };
  error?: string;
}

/**
 * 圖片存取回應型別
 */
export interface ImageAccessResponse {
  type: "redirect" | "json" | "error" | "direct" | "proxy";
  url?: string;
  data?: any;
  statusCode?: number;
  headers?: Record<string, string>;
  stream?: ReadableStream;
}

/**
 * 上傳回應
 */
export interface UploadResponse {
  success: boolean;
  hash?: string;
  shortUrl?: string;
  url?: string;
  filename?: string;
  extension?: string;
  error?: string;
  message?: string;
}

/**
 * 批次操作回應
 */
export interface BatchOperationResult<T = any> {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
}
