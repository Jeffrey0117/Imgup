/**
 * 相簿相關型別定義
 */

import { AdminImageItem } from "./mapping";

/**
 * 基礎相簿型別
 */
export interface Album {
  id: string;
  name: string;
  description: string | null;
  coverImageHash: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 簡化版相簿型別（用於選擇器等）
 */
export interface AlbumSummary {
  id: string;
  name: string;
  itemCount: number;
}

/**
 * 相簿項目型別（含完整映射資訊）
 */
export interface AlbumItem {
  id: string;
  order: number;
  note: string | null;
  title: string | null; // 圖片標題
  isFavorite: boolean; // 是否為最愛
  createdAt: string;
  mapping: {
    id: string;
    hash: string;
    filename: string;
    url: string;
    shortUrl: string;
    createdAt: string;
    expiresAt: string | null;
    isDeleted: boolean;
    fileExtension: string | null;
  };
}

/**
 * 簡化版相簿圖片項目（Gallery 用）
 */
export interface AlbumImageItem {
  id: string;
  note: string | null;
  title: string | null;
  isFavorite: boolean;
  mapping: {
    hash: string;
    filename: string;
    url: string;
    createdAt: string;
    fileExtension: string | null;
  };
}
