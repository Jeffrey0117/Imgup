import { Metadata } from "next";

export const metadata: Metadata = {
  title: "數據分析 - duk.tw Admin",
};

export default function AnalyticsPage() {
  return (
    <div>
      <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b", marginBottom: "24px" }}>
        📈 數據分析
      </h1>
      <p style={{ color: "#64748b" }}>後續階段實作</p>
    </div>
  );
}
