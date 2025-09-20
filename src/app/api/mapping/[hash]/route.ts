import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
    });

    if (!mapping) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 檢查是否過期
    if (mapping.expiresAt && new Date(mapping.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // 智能路由邏輯現在由 middleware 處理
    // 此 API 路由現在只負責回傳 JSON 資料
    console.log("API 路由: 回傳映射資料", { hash });

    return NextResponse.json(mapping);
  } catch (error) {
    console.error("查詢短網址錯誤:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
