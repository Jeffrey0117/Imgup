"use client";

interface QRCodeProps {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 150 }: QRCodeProps) {
  // 沒有值時不渲染，避免 400 (Bad Request)
  if (!value) return null;

  // 使用免費的 QR Code API 服務
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value
  )}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        margin: "16px 0",
      }}
    >
      <img
        src={qrCodeUrl}
        alt="QR Code"
        style={{
          border: "4px solid #fff",
          borderRadius: "8px",
          background: "#fff",
          padding: "8px",
        }}
        onError={(e) => {
          // 如果 QR Code API 失敗，隱藏圖片
          e.currentTarget.style.display = "none";
        }}
      />
      <span
        style={{
          fontSize: "12px",
          color: "#999",
          textAlign: "center",
        }}
      >
        掃描 QR Code 快速存取
      </span>
    </div>
  );
}
