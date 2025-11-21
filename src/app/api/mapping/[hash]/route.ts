import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;
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
        fileExtension: true, // 確保包含 fileExtension
      }
    });

    if (!mapping) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 檢查是否過期
    if (mapping.expiresAt && new Date(mapping.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // 智能路由邏輯現在由 middleware 處理
    // 此 API 路由現在只負責回傳 JSON 資料（序列化以避免水合差異）
    console.log("API 路由: 回傳映射資料", {
      hash,
      fileExtension: mapping.fileExtension ?? null
    });

    const serialized = {
      id: mapping.id,
      hash: mapping.hash,
      filename: mapping.filename,
      url: mapping.url,
      shortUrl: mapping.shortUrl,
      createdAt: new Date(mapping.createdAt).toISOString(),
      expiresAt: mapping.expiresAt ? new Date(mapping.expiresAt).toISOString() : null,
      hasPassword: !!mapping.password, // 只返回是否有密碼，不返回密碼本身
      fileExtension: (mapping as any).fileExtension ?? null,
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("查詢短網址錯誤:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
