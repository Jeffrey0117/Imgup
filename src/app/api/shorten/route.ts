import { NextRequest, NextResponse } from "next/server";
import { generateShortHash } from "../../../utils/hash";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    console.error("短網址生成錯誤:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
