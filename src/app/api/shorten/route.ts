import { NextRequest, NextResponse } from "next/server";
import { generateShortHash } from "../../../utils/hash";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 添加 debug logs 檢查 Prisma 狀態
console.log("Prisma client 初始化狀態:", {
  isConnected: prisma ? true : false,
  DATABASE_URL: process.env.DATABASE_URL ? "已設定" : "未設定",
  DATABASE_URL_length: process.env.DATABASE_URL?.length || 0,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV || "非 Vercel 環境",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, filename, expiresAt, password } = body;

    console.log("後端收到請求 - 輸入值:", {
      url: url,
      filename: filename,
      expiresAt: expiresAt,
      password: password,
      current_time: new Date().toISOString(),
    });

    if (!url || !filename) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // 使用檔名+原始URL一起生成hash，避免不同欄位混淆
    const baseString = url + "|" + filename;
    console.log("後端 hash 生成準備:", {
      baseString: baseString,
      url_length: url.length,
      filename_length: filename.length,
    });
    const hash = generateShortHash(baseString);
    console.log("後端 hash 生成結果:", {
      hash: hash,
      baseString: baseString,
    });

    const host = request.headers.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const baseUrl = host
      ? `${protocol}://${host}`
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shortUrl = `${baseUrl}/${hash}`;

    // 儲存到資料庫，使用 upsert 確保 hash 唯一且一致
    const mapping = await prisma.mapping.upsert({
      where: { hash },
      update: {
        filename,
        url,
        shortUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        password: password || null,
      },
      create: {
        id: hash,
        hash,
        filename,
        url,
        shortUrl,
        createdAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // UTC+8 台灣時區
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        password: password || null,
      },
    });

    return NextResponse.json({
      success: true,
      hash,
      shortUrl,
      mapping,
    });
  } catch (error) {
    console.error("短網址生成錯誤:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      DATABASE_URL: process.env.DATABASE_URL ? "已設定" : "未設定",
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || "非 Vercel 環境",
    });

    // 根據錯誤類型返回更具體的訊息
    if (error instanceof Error) {
      if (error.message.includes("Prisma")) {
        return NextResponse.json(
          { error: "資料庫連接錯誤", details: error.message },
          { status: 500 }
        );
      }
      if (error.message.includes("DATABASE_URL")) {
        return NextResponse.json(
          { error: "資料庫配置錯誤", details: "DATABASE_URL 未正確設定" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
