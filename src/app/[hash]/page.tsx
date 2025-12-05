import { redirect, notFound } from "next/navigation";
import { Metadata } from "next";
import { isValidHash } from "../../utils/hash";
import prisma from "@/lib/prisma";

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

    const title = mapping.filename
      ? `${mapping.filename} - 圖鴨分享`
      : "圖鴨分享 - duk.tw";

    return {
      title,
      description: `在 duk.tw 查看分享的圖片${mapping.filename ? `: ${mapping.filename}` : ""}`,
      openGraph: {
        title,
        description: `在 duk.tw 查看分享的圖片`,
        siteName: "duk.tw",
        type: "article",
        url: pageUrl,
        images: [
          {
            url: imageUrl,
            alt: mapping.filename || "分享圖片",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: `在 duk.tw 查看分享的圖片`,
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
