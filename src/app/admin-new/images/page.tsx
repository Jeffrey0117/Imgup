import { Metadata } from "next";

export const metadata: Metadata = {
  title: "圖片管理 - duk.tw Admin",
};

export default function ImagesPage() {
  return (
    <div>
      <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b", marginBottom: "24px" }}>
        🖼️ 圖片管理
      </h1>
      <p style={{ color: "#64748b" }}>Phase 3 & 4 將實作表格視圖與網格視圖</p>
    </div>
  );
}
