import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { isValidHash } from "@/utils/hash";
import { parseHashedFilename } from "@/utils/file-extension";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash: rawHash } = params;

    // 解析 hash 和副檔名
    const { hash, extension } = parseHashedFilename(rawHash);

    console.log("Smart Route 解析:", { rawHash, hash, extension });

    // 驗證 hash 格式（去除副檔名後的 hash）
    if (!isValidHash(hash)) {
      return NextResponse.redirect(new URL(`/${rawHash}`, req.url), {
        status: 302,
      });
    }

    // 查詢映射資料
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
    });

    if (!mapping) {
      // 如果映射不存在，重定向到 Next.js 頁面路由處理 404
      return NextResponse.redirect(new URL(`/${rawHash}`, req.url), {
        status: 302,
      });
    }

    // 檢查是否過期
    if (mapping.expiresAt && new Date(mapping.expiresAt) < new Date()) {
      return NextResponse.redirect(new URL(`/${rawHash}`, req.url), {
        status: 302,
      });
    }

    // 獲取請求 headers
    const acceptHeader = req.headers.get("accept") || "";
    const userAgent = req.headers.get("user-agent") || "";
    const referer = req.headers.get("referer") || "";

    // 智能路由判斷邏輯
    const isBrowserDirectRequest = acceptHeader.includes("text/html");

    const isImageRequest =
      !isBrowserDirectRequest &&
      (acceptHeader.includes("image/") || acceptHeader === "*/*");

    console.log("Smart Route 判斷:", {
      hash,
      extension,
      acceptHeader,
      userAgent: userAgent.substring(0, 50),
      referer: referer.substring(0, 50),
      isImageRequest,
      isBrowserDirectRequest,
      mappingExtension: (mapping as any).fileExtension,
    });

    // 如果有副檔名且匹配資料庫中的副檔名，優先處理為圖片請求
    const hasMatchingExtension = extension && (mapping as any).fileExtension === extension;

    if (hasMatchingExtension && mapping.url) {
      console.log(`Smart Route: 副檔名匹配，直接重定向到圖片: ${mapping.url}`);
      return NextResponse.redirect(mapping.url, { status: 302 });
    }

    // 如果是圖片請求且沒有匹配的副檔名，檢查是否為通用圖片請求
    if (isImageRequest && mapping.url && !extension) {
      console.log(`Smart Route: 圖片請求，直接重定向到圖片: ${mapping.url}`);
      return NextResponse.redirect(mapping.url, { status: 302 });
    }

    // 如果是瀏覽器直接請求，重定向到預覽頁面
    if (isBrowserDirectRequest) {
      const previewUrl = new URL(`/${hash}/p`, req.url);
      console.log(`Smart Route: 重定向到預覽頁: ${previewUrl.toString()}`);
      return NextResponse.redirect(previewUrl, { status: 302 });
    }

    // 如果有副檔名但不匹配，視為預覽頁面請求
    if (extension && !hasMatchingExtension) {
      const previewUrl = new URL(`/${hash}/p`, req.url);
      console.log(`Smart Route: 副檔名不匹配，重定向到預覽頁: ${previewUrl.toString()}`);
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