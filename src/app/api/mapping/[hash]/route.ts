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

    // 智能路由邏輯：根據 Accept Header 判斷回應類型
    const acceptHeader = req.headers.get("accept") || "";
    const userAgent = req.headers.get("user-agent") || "";

    // 檢查是否為圖片請求
    const isImageRequest =
      acceptHeader.includes("image/") ||
      (acceptHeader.includes("*/*") && userAgent.includes("img")) ||
      req.nextUrl.searchParams.get("direct") === "true";

    // 檢查是否為瀏覽器請求預覽頁
    const isBrowserRequest =
      acceptHeader.includes("text/html") && !isImageRequest;

    console.log("智能路由判斷:", {
      hash,
      acceptHeader,
      userAgent: userAgent.substring(0, 50),
      isImageRequest,
      isBrowserRequest,
      queryParams: Object.fromEntries(req.nextUrl.searchParams),
    });

    // 如果是圖片請求，直接 302 重定向到圖片 URL
    if (isImageRequest && mapping.url) {
      console.log(`直接重定向到圖片: ${mapping.url}`);
      return NextResponse.redirect(mapping.url, { status: 302 });
    }

    // 如果是瀏覽器請求，重定向到預覽頁面
    if (isBrowserRequest) {
      const previewUrl = `${req.nextUrl.origin}/${hash}/p`;
      console.log(`重定向到預覽頁: ${previewUrl}`);
      return NextResponse.redirect(previewUrl, { status: 302 });
    }

    // API 呼叫或其他情況，回傳 JSON 資料
    return NextResponse.json(mapping);
  } catch (error) {
    console.error("查詢短網址錯誤:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
