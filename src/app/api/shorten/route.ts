import { NextRequest, NextResponse } from "next/server";
import { generateUniqueHash } from "../../../utils/hash";
import { PrismaClient } from "@prisma/client";
import { formatApiError, formatDatabaseError, logError } from "@/utils/api-errors";
import { logErrorWithContext } from "@/utils/secure-logger";

const prisma = new PrismaClient();

// 移除敏感 debug logs - 安全修復
// console.log("Prisma client 初始化狀態:", {
//   isConnected: prisma ? true : false,
//   DATABASE_URL: process.env.DATABASE_URL ? "已設定" : "未設定",
//   DATABASE_URL_length: process.env.DATABASE_URL?.length || 0,
//   NODE_ENV: process.env.NODE_ENV,
//   VERCEL_ENV: process.env.VERCEL_ENV || "非 Vercel 環境",
// });

// 設定最大 payload 大小：1MB（短網址不需要太大）
const MAX_PAYLOAD_SIZE = 1 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // 檢查請求大小
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: "請求資料過大" }, { status: 413 });
    }

    const body = await request.json();
    const { url, filename, expiresAt, password } = body;

    // 移除敏感 debug logs - 安全修復
    // console.log("後端收到請求 - 輸入值:", {
    //   url: url,
    //   filename: filename,
    //   expiresAt: expiresAt,
    //   password: password,
    //   current_time: new Date().toISOString(),
    // });

    if (!url || !filename) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // 使用檔名+原始URL一起生成hash，避免不同欄位混淆
    const baseString = url + "|" + filename;
    // 移除敏感 debug logs - 安全修復
    // console.log("後端 hash 生成準備:", {
    //   baseString: baseString,
    //   url_length: url.length,
    //   filename_length: filename.length,
    // });

    // 防碰撞檢查函數
    const checkHashExists = async (hash: string): Promise<boolean> => {
      try {
        const existing = await prisma.mapping.findUnique({
          where: { hash },
        });
        return !!existing;
      } catch (error) {
        console.error("檢查 hash 是否存在時出錯:", error);
        return false; // 出錯時假設不存在，讓其繼續
      }
    };

    const hash = await generateUniqueHash(baseString, checkHashExists);
    // 移除敏感 debug logs - 安全修復
    // console.log("後端 hash 生成結果:", {
    //   hash: hash,
    //   baseString: baseString,
    //   hash_length: hash.length,
    // });

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
        createdAt: new Date(), // 正確儲存 UTC 時間
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
    // 安全記錄錯誤，避免洩漏敏感資訊
    logErrorWithContext('短網址生成', error);

    // 檢查是否為資料庫相關錯誤
    if (error instanceof Error && error.message.includes("Prisma")) {
      const dbError = formatDatabaseError(error);
      return NextResponse.json(dbError, { status: 500 });
    }

    // 返回安全的錯誤訊息
    const safeError = formatApiError(error);
    return NextResponse.json(safeError, { status: 500 });
  }
}
