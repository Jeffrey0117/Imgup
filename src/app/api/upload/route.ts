import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 改造成：呼叫外部 API → 取得 fileUrl → 存 hash 映射
export async function POST(request: NextRequest) {
  try {
    const { fileName, contentType, hash } = await request.json();

    // 呼叫既有外部 API，獲取最終檔案 URL
    const externalRes = await fetch("https://meteor.today/upload/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, contentType }),
    });

    if (!externalRes.ok) {
      return NextResponse.json(
        { status: 0, message: "外部 API 錯誤" },
        { status: externalRes.status }
      );
    }

    const { fileUrl } = await externalRes.json();

    // 透過 Prisma 儲存短網址映射
    await prisma.mapping.upsert({
      where: { hash },
      update: { url: fileUrl },
      create: { hash, url: fileUrl },
    });

    return NextResponse.json({
      status: 1,
      shortUrl: "/" + hash,
      fileUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { status: 0, message: "Upload failed" },
      { status: 500 }
    );
  }
}
