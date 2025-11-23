"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";

interface ImageData {
  url: string;
  filename: string;
  hash: string;
}

interface ImageViewerProps {
  images: ImageData[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageViewer({
  images,
  initialIndex,
  onClose,
}: ImageViewerProps) {
  const toast = useToast();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const currentImage = images[currentIndex];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.95)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "20px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ color: "white", fontSize: "16px", fontWeight: "600" }}>
          {currentImage.filename}
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ color: "#99a0ab", fontSize: "14px" }}>
            {currentIndex + 1} / {images.length}
          </span>
          <button
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 20px",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.url}
          alt={currentImage.filename}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            userSelect: "none",
          }}
          onError={(e) => {
            e.currentTarget.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23111' width='400' height='300'/%3E%3Ctext x='200' y='150' text-anchor='middle' dy='.3em' fill='%23666' font-size='18'%3E無法載入圖片%3C/text%3E%3C/svg%3E";
          }}
        />
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            style={{
              position: "absolute",
              left: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              color: "white",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(88,194,88,0.3)";
              e.currentTarget.style.borderColor = "#58c258";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.6)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            }}
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            style={{
              position: "absolute",
              right: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              color: "white",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(88,194,88,0.3)";
              e.currentTarget.style.borderColor = "#58c258";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.6)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            }}
          >
            ›
          </button>
        </>
      )}

      {/* Bottom Info */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "20px",
          background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            navigator.clipboard.writeText(
              `${window.location.origin}/${currentImage.hash}`
            );
            toast.success("已複製連結");
          }}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            color: "white",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(88,194,88,0.3)";
            e.currentTarget.style.borderColor = "#58c258";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          }}
        >
          📋 複製連結
        </button>
        <button
          onClick={() => window.open(`/${currentImage.hash}`, "_blank")}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            color: "white",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(88,194,88,0.3)";
            e.currentTarget.style.borderColor = "#58c258";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          }}
        >
          🔗 開啟連結
        </button>
      </div>

      {/* Keyboard Hints */}
      <div
        style={{
          position: "absolute",
          bottom: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "8px 16px",
          borderRadius: "8px",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          color: "#99a0ab",
          fontSize: "12px",
          pointerEvents: "none",
        }}
      >
        使用 ← → 鍵切換圖片 | ESC 鍵關閉
      </div>
    </div>
  );
}
