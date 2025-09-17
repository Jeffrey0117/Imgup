import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "圖鴨上床(ImgUP) - 免費圖床工具",
  description:
    "圖鴨上床(ImgUP) - 批量上傳圖片並生成 Markdown 連結的免費圖床工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
