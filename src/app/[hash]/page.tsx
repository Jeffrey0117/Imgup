import { redirect } from "next/navigation";

interface Props {
  params: { hash: string };
}

export default async function SmartRoutePage({ params }: Props) {
  // 這個頁面作為客戶端路由的智能分發器
  // 實際的智能路由邏輯在 API 層 (/api/mapping/[hash]/route.ts) 處理
  // 如果用戶直接訪問這個路由，重定向到預覽頁面
  redirect(`/${params.hash}/p`);
}
