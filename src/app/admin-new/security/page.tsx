import { Metadata } from "next";

export const metadata: Metadata = {
  title: "安全管理 - duk.tw Admin",
};

export default function SecurityPage() {
  return (
    <div>
      <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b", marginBottom: "24px" }}>
        🔐 安全管理
      </h1>
      <p style={{ color: "#64748b" }}>後續階段實作</p>
    </div>
  );
}
