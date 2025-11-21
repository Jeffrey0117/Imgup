import { NextRequest, NextResponse } from "next/server";
import { generateUniqueHash } from "@/utils/hash";
import { prisma } from "@/lib/prisma";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";

/**
 * Admin 專用的「網址轉短網址」API
 *
 * 功能：
 * 1. 驗證 Admin 權限
 * 2. 接受圖片網址輸入
 * 3. 生成短網址並儲存到資料庫
 * 4. 支援密碼保護和過期時間設定
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 驗證 Admin 權限（從 cookie 或 header 取得 admin_token）
    let token = extractTokenFromRequest(request);
    if (!token) {
      token = request.cookies.get("admin_token")?.value || null;
      if (!token) {
        // 嘗試從 cookie header 中解析
        const cookieHeader = request.headers.get("cookie");
        if (cookieHeader) {
          const cookies = cookieHeader.split(";").map((c) => c.trim());
          for (const cookie of cookies) {
            if (cookie.startsWith("admin_token=")) {
              token = cookie.split("=")[1];
              break;
            }
          }
        }
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Missing admin token" },
        { status: 401 }
      );
    }

    // 驗證 admin session
    const auth = await verifyAdminSession(token);
    if (!auth.valid || !auth.admin) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired session" },
        { status: 401 }
      );
    }

    // 2. 解析請求參數
    const body = await request.json();
    const { url, filename, password, expiresAt } = body;

    // 驗證必要參數
    if (!url || !filename) {
      return NextResponse.json(
        { error: "Missing required parameters: url and filename are required" },
        { status: 400 }
      );
    }

    // 3. 驗證 URL 格式（基本驗證）
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // 4. 生成唯一 hash（復用現有邏輯）
    const baseString = url + "|" + filename;
    const checkHashExists = async (hash: string): Promise<boolean> => {
      try {
        const existing = await prisma.mapping.findUnique({
          where: { hash },
        });
        return !!existing;
      } catch (error) {
        console.error("檢查 hash 是否存在時出錯:", error);
        return false;
      }
    };
    const hash = await generateUniqueHash(baseString, checkHashExists);

    // 5. 建立短網址
    const host = request.headers.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const baseUrl = host
      ? `${protocol}://${host}`
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shortUrl = `${baseUrl}/${hash}`;

    // 6. 儲存到資料庫（使用 upsert）
    const mapping = await prisma.mapping.upsert({
      where: { hash },
      update: {
        filename,
        url, // 直接存原始圖片網址！
        shortUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        password: password || null,
      },
      create: {
        id: hash,
        hash,
        filename,
        url, // 直接存原始圖片網址！
        shortUrl,
        createdAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        password: password || null,
        uploadStats: {
          adminId: auth.admin.id,
          sourceType: "admin_url_upload",
        },
      },
    });

    // 7. 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: auth.admin.id,
        action: "CREATE",
        entity: "mapping",
        entityId: mapping.id,
        details: {
          filename: mapping.filename,
          url: mapping.url,
          shortUrl: mapping.shortUrl,
          hasPassword: !!password,
          hasExpiry: !!expiresAt,
          sourceType: "admin_url_upload",
        },
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          "127.0.0.1",
      },
    });

    // 8. 返回結果
    return NextResponse.json({
      success: true,
      hash,
      shortUrl,
      mapping: {
        id: mapping.id,
        hash: mapping.hash,
        filename: mapping.filename,
        url: mapping.url,
        shortUrl: mapping.shortUrl,
        createdAt: mapping.createdAt.toISOString(),
        expiresAt: mapping.expiresAt ? mapping.expiresAt.toISOString() : null,
        hasPassword: !!mapping.password,
      },
    });
  } catch (error) {
    console.error("Admin shorten-image error:", error);

    // 根據錯誤類型返回更具體的訊息
    if (error instanceof Error) {
      if (error.message.includes("Prisma")) {
        return NextResponse.json(
          { error: "Database connection error", details: error.message },
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
