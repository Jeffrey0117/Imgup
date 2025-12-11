import { redirect, notFound } from "next/navigation";
import { Metadata } from "next";
import { isValidHash } from "../../utils/hash";
import prisma from "@/lib/prisma";

// ISR: 每 60 秒重新驗證一次，大幅減少 Serverless Function 調用
export const revalidate = 60;

interface Props {
  params: Promise<{ hash: string }>;
}

// 動態生成 metadata（包含 OG 圖片）- 社交媒體爬蟲會讀取這些
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hash: rawHash } = await params;
  const hash = rawHash.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, "");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://duk.tw";
  const proxyUrl = process.env.NEXT_PUBLIC_PROXY_URL || "https://i.duk.tw";

  // 預設 metadata
  const defaultMetadata: Metadata = {
    title: "圖鴨分享 - duk.tw",
    description: "免費圖片分享服務",
  };

  if (!isValidHash(hash)) {
    return defaultMetadata;
  }

  try {
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
      select: {
        filename: true,
        fileExtension: true,
        expiresAt: true,
      },
    });

    if (!mapping || (mapping.expiresAt && mapping.expiresAt < new Date())) {
      return defaultMetadata;
    }

    // 推導副檔名
    const getExtension = () => {
      if (mapping.fileExtension) {
        return mapping.fileExtension.startsWith(".")
          ? mapping.fileExtension
          : `.${mapping.fileExtension}`;
      }
      const filenameMatch = mapping.filename?.match(/\.([a-zA-Z0-9]+)$/);
      if (filenameMatch) {
        return `.${filenameMatch[1].toLowerCase()}`;
      }
      return "";
    };

    const ext = getExtension();
    const imageUrl = `${proxyUrl}/${hash}${ext}`;
    const pageUrl = `${baseUrl}/${hash}/p`;

    const title = "圖鴨上床 duk.tw - 最好用的免費圖床";
    const description = "免費圖片分享，支援快速上傳，免註冊即可使用";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: "duk.tw",
        type: "article",
        url: pageUrl,
        images: [
          {
            url: imageUrl,
            alt: "圖鴨上床分享圖片",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return defaultMetadata;
  }
}

export default async function SmartRoutePage({ params }: Props) {
  const { hash: rawHash } = await params;
  
  // 移除副檔名（如果有）
  const hashWithoutExt = rawHash.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');
  
  // 驗證 hash 格式
  if (!isValidHash(hashWithoutExt)) {
    redirect("/");
  }

  // 檢查資料庫中是否存在此 hash
  const mapping = await prisma.mapping.findUnique({
    where: { hash: hashWithoutExt },
  });

  if (!mapping) {
    notFound();
  }

  // 檢查是否過期
  if (mapping.expiresAt && mapping.expiresAt < new Date()) {
    notFound();
  }

  // 統一導向預覽頁面（密碼驗證由 Smart Route API 或預覽頁面處理）
  redirect(`/${hashWithoutExt}/p`);
}
