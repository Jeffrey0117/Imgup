import { redirect } from "next/navigation";
import { isValidHash } from "../../utils/hash";

interface Props {
  params: { hash: string };
}

export default async function SmartRoutePage({ params }: Props) {
  // 驗證 hash 格式
  if (!isValidHash(params.hash)) {
    redirect("/");
  }

  // 智能路由邏輯現在由 middleware 處理
  // 如果請求到達這裡，表示 middleware 決定讓它通過
  // 預設行為是重定向到預覽頁面
  redirect(`/${params.hash}/p`);
}
