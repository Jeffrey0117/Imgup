import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - duk.tw Admin",
};

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b", marginBottom: "24px" }}>
        Dashboard 儀表板
      </h1>
      <p style={{ color: "#64748b" }}>Phase 2 將實作 KPI 統計與數據展示</p>
    </div>
  );
}
