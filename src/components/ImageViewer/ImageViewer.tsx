"use client";

import { forwardRef } from "react";
import styles from "./ImageViewer.module.css";

interface ImageViewerProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  onError?: (error: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
  className?: string;
}

const ImageViewer = forwardRef<HTMLImageElement, ImageViewerProps>(
  ({ src, alt, fallbackSrc, onError, onDragStart, className }, ref) => {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;

      // First attempt: try fallback URL
      if (fallbackSrc && !img.dataset.triedFallback) {
        img.dataset.triedFallback = "true";
        img.src = fallbackSrc;
        return;
      }

      // Final attempt: use transparent placeholder
      if (!img.dataset.failedOnce) {
        img.dataset.failedOnce = "true";
        img.src =
          "data:image/svg+xml;charset=utf-8," +
          encodeURIComponent(
            "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='100%' height='100%' fill='transparent'/></svg>"
          );
      }

      if (onError) {
        onError("圖片載入失敗");
      }
    };

    const handleDragStart = (e: React.DragEvent) => {
      e.preventDefault();
      if (onDragStart) {
        onDragStart(e);
      }
    };

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={className || styles.image}
        onError={handleImageError}
        onDragStart={handleDragStart}
      />
    );
  }
);

ImageViewer.displayName = "ImageViewer";

export default ImageViewer;