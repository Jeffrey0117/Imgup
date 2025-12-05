import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { isValidHash } from "../../../utils/hash";
import PreviewClientWrapper from "./PreviewClientWrapper";

interface Props {
  params: Promise<{ hash: string }>;
}

// 獲取圖片資訊的共用函數
async function getMapping(hash: string) {
  if (!isValidHash(hash)) {
    return null;
  }

  try {
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
      select: {
        id: true,
        hash: true,
        filename: true,
        url: true,
        shortUrl: true,
        createdAt: true,
        expiresAt: true,
        password: true,
        fileExtension: true,
      },
    });

    if (!mapping) {
      return null;
    }

    // 檢查是否過期
    if (mapping.expiresAt && new Date(mapping.expiresAt) < new Date()) {
      return null;
    }

    return mapping;
  } catch (error) {
    console.error("Error fetching mapping:", error);
    return null;
  }
}

// 動態生成 metadata（包含 OG 圖片）
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hash } = await params;
  const mapping = await getMapping(hash);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://duk.tw";
  const proxyUrl = process.env.NEXT_PUBLIC_PROXY_URL || "https://i.duk.tw";

  // 預設 metadata
  const defaultMetadata: Metadata = {
    title: "圖鴨分享 - duk.tw",
    description: "免費圖片分享服務",
    openGraph: {
      title: "圖鴨分享 - duk.tw",
      description: "免費圖片分享服務",
      siteName: "duk.tw",
      type: "website",
    },
  };

  if (!mapping) {
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
}

export default async function PreviewPage({ params }: Props) {
  const { hash } = await params;

  // 驗證 hash
  if (!isValidHash(hash)) {
    notFound();
  }

  // 預取 mapping 資料（給 client 用）
  const mapping = await getMapping(hash);

  // 序列化資料以傳給 client component
  const serializedMapping = mapping
    ? {
        hash: mapping.hash,
        url: mapping.url,
        filename: mapping.filename,
        shortUrl: mapping.shortUrl,
        createdAt: mapping.createdAt.toISOString(),
        expiresAt: mapping.expiresAt ? mapping.expiresAt.toISOString() : null,
        hasPassword: !!mapping.password,
        fileExtension: mapping.fileExtension ?? null,
      }
    : null;

  return (
    <PreviewClientWrapper
      hash={hash}
      initialMapping={serializedMapping}
    />
  );
}
