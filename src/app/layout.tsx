import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "圖鴨上床(duk.tw)–台灣熱門圖床｜免費上傳、圖片空間分享",
  description:
    "圖鴨上床(duk.tw) - 批量上傳圖片並生成 Markdown 連結的免費圖床工具",
  icons: {
    icon: "/logo-imgup2.png",
    shortcut: "/logo-imgup2.png",
    apple: "/logo-imgup2.png",
  },
  openGraph: {
    title: "圖鴨上床(duk.tw)–台灣熱門圖床｜免費上傳、圖片空間分享",
    description: "圖鴨上床(duk.tw) - 台灣熱門免費上傳、圖片空間分享",
    url: "https://duk.tw",
    siteName: "duk.tw",
    images: [
      {
        url: "/og_image_logo.png",
        width: 1200,
        height: 630,
        alt: "圖鴨上床(duk.tw)–台灣熱門圖床｜免費上傳、圖片空間分享",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "圖鴨上床(duk.tw)–台灣熱門圖床｜免費上傳、圖片空間分享",
    description: "圖鴨上床(duk.tw) - 台灣熱門免費上傳、圖片空間分享",
    images: ["/og_image_logo.png"],
    creator: "@duk_tw",
  },
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
