"use client";

import { useRouter } from "next/navigation";
import styles from "../albums.module.css";

interface Album {
  id: string;
  name: string;
  description: string | null;
  coverImageHash: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AlbumGridProps {
  albums: Album[];
  onDelete?: (albumId: string) => void;
  onCreate?: () => void;
}

export default function AlbumGrid({ albums, onDelete, onCreate }: AlbumGridProps) {
  const router = useRouter();

  const handleCardClick = (albumId: string) => {
    router.push(`/admin-new/albums/${albumId}`);
  };

  const handleDelete = (e: React.MouseEvent, albumId: string) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(albumId);
    }
  };

  if (albums.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3>尚未建立任何相簿</h3>
        <p>開始創建你的第一個相簿來收藏圖片吧！</p>
        {onCreate && (
          <button onClick={onCreate} className={styles.createButton}>
            ➕ 創建相簿
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.albumGrid}>
      {/* Create New Album Card */}
      {onCreate && (
        <div className={styles.createAlbumCard} onClick={onCreate}>
          <div className={styles.createAlbumIcon}>➕</div>
          <div className={styles.createAlbumText}>新增相簿</div>
        </div>
      )}

      {/* Album Cards */}
      {albums.map((album) => (
        <div
          key={album.id}
          className={styles.albumCard}
          onClick={() => handleCardClick(album.id)}
        >
          {/* Cover Image */}
          <div className={styles.albumCover}>
            {album.coverImageHash ? (
              <img
                src={`/${album.coverImageHash}`}
                alt={album.name}
                className={styles.albumCoverImage}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const placeholder = e.currentTarget.parentElement?.querySelector(
                    `.${styles.albumCoverPlaceholder}`
                  );
                  if (placeholder) {
                    (placeholder as HTMLElement).style.display = "block";
                  }
                }}
              />
            ) : null}
            <div
              className={styles.albumCoverPlaceholder}
              style={{ display: album.coverImageHash ? "none" : "block" }}
            >
              📁
            </div>
          </div>

          {/* Album Info */}
          <div className={styles.albumInfo}>
            <h3 className={styles.albumName} title={album.name}>
              {album.name}
            </h3>
            <div className={styles.albumMeta}>
              <span className={styles.albumCount}>
                {album.itemCount} 張圖片
              </span>
            </div>
          </div>

          {/* Delete Button */}
          {onDelete && (
            <button
              className={styles.albumDelete}
              onClick={(e) => handleDelete(e, album.id)}
              title="刪除相簿"
            >
              🗑️
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
