/**
 * 中央型別匯出檔案
 * 統一管理所有共用型別
 */

// Mapping 相關型別
export type {
  BaseMapping,
  ClientMapping,
  AdminImageItem,
  AdminMappingItem,
  TimelineItem,
  UploadItem,
  StoredImage,
} from "./mapping";

// Album 相關型別
export type {
  Album,
  AlbumSummary,
  AlbumItem,
  AlbumImageItem,
} from "./album";

// Admin 相關型別
export type {
  AdminTokenPayload,
  AdminData,
  LoginResult,
  AdminSessionResult,
} from "./admin";

// API 相關型別
export type {
  ApiResponse,
  PaginationInfo,
  PaginatedApiResponse,
  ImageAccessResponse,
  UploadResponse,
  BatchOperationResult,
} from "./api";
