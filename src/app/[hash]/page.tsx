import { redirect, notFound } from "next/navigation";
import { isValidHash } from "../../utils/hash";
import prisma from "@/lib/prisma";

interface Props {
  params: { hash: string };
}

export default async function SmartRoutePage({ params }: Props) {
  const rawHash = params.hash;
  
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

  // 預設行為是重定向到預覽頁面
  redirect(`/${hashWithoutExt}/p`);
}
