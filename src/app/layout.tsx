import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "../components/Header";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "圖鴨上床(duk.tw)–台灣熱門圖床｜免費上傳、圖片空間分享",
  description:
    "圖鴨上床 duk.tw，台灣熱門免費圖床，支援圖片快速上傳，免註冊即可分享，穩定又方便。",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  verification: {
    google: "25Xjaefx0m920B4GPVL4Qi6A8Ac7_-26BVy_xElQexY",
  },
  other: {
    "google-adsense-account": "ca-pub-4526447705456258",
  },
  icons: {
    icon: "/my-icon.ico",
    shortcut: "/my-icon.ico",
    apple: "/my-icon.ico",
  },
  openGraph: {
    title: "圖鴨上床(duk.tw)–台灣熱門圖床｜免費上傳、圖片空間分享",
    description:
      "圖鴨上床 duk.tw，台灣熱門免費圖床，支援圖片快速上傳，免註冊即可分享，穩定又方便。",
    url: "https://duk.tw",
    siteName: "duk.tw",
    images: [
      {
        url: "https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png",
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
    description:
      "圖鴨上床 duk.tw，台灣熱門免費圖床，支援圖片快速上傳，免註冊即可分享，穩定又方便。",
    images: ["https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png"],
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
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4526447705456258"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body suppressHydrationWarning>
        <Header />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
