import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { isValidHash } from "@/utils/hash";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;

    // 驗證 hash 格式
    if (!isValidHash(hash)) {
      return NextResponse.redirect(new URL(`/${hash}`, req.url), {
        status: 302,
      });
    }

    // 查詢映射資料
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
    });

    if (!mapping) {
      // 如果映射不存在，重定向到 Next.js 頁面路由處理 404
      return NextResponse.redirect(new URL(`/${hash}`, req.url), {
        status: 302,
      });
    }

    // 檢查是否過期
    if (mapping.expiresAt && new Date(mapping.expiresAt) < new Date()) {
      return NextResponse.redirect(new URL(`/${hash}`, req.url), {
        status: 302,
      });
    }

    // 獲取請求 headers
    const acceptHeader = req.headers.get("accept") || "";
    const userAgent = req.headers.get("user-agent") || "";
    const referer = req.headers.get("referer") || "";

    // 智能路由判斷邏輯
    const isImageRequest =
      // 直接的圖片請求
      acceptHeader.includes("image/") ||
      // img 標籤請求 (通常有 */* accept header)
      (acceptHeader.includes("*/*") &&
        (userAgent.includes("Mozilla") ||
          userAgent.includes("Chrome") ||
          userAgent.includes("Safari")) &&
        !acceptHeader.includes("text/html")) ||
      // 來自 img 標籤的請求通常不會有 text/html
      (acceptHeader === "*/*" &&
        !referer.includes("google") &&
        !referer.includes("facebook"));

    const isBrowserDirectRequest =
      acceptHeader.includes("text/html") &&
      (userAgent.includes("Mozilla") ||
        userAgent.includes("Chrome") ||
        userAgent.includes("Safari"));

    console.log("Smart Route 判斷:", {
      hash,
      acceptHeader,
      userAgent: userAgent.substring(0, 50),
      referer: referer.substring(0, 50),
      isImageRequest,
      isBrowserDirectRequest,
    });

    // 如果是圖片請求，直接重定向到圖片 URL
    if (isImageRequest && mapping.url) {
      console.log(`Smart Route: 直接重定向到圖片: ${mapping.url}`);
      return NextResponse.redirect(mapping.url, { status: 302 });
    }

    // 如果是瀏覽器直接請求，重定向到預覽頁面
    if (isBrowserDirectRequest) {
      const previewUrl = new URL(`/${hash}/p`, req.url);
      console.log(`Smart Route: 重定向到預覽頁: ${previewUrl.toString()}`);
      return NextResponse.redirect(previewUrl, { status: 302 });
    }

    // 其他情況（API 請求），回傳 JSON 資料
    return NextResponse.json(mapping);
  } catch (error) {
    console.error("Smart Route 錯誤:", error);
    // 發生錯誤時，重定向到原路由讓 Next.js 處理
    return NextResponse.redirect(new URL(`/${params.hash}`, req.url), {
      status: 302,
    });
  } finally {
    await prisma.$disconnect();
  }
}
