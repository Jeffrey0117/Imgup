import { NextRequest, NextResponse } from "next/server";
import { generateShortHash } from "../../../utils/hash";

export async function POST(request: NextRequest) {
  try {
    const { url, filename, expiresAt, password } = await request.json();

    if (!url || !filename) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // 生成短網址 hash
    const hash = generateShortHash(url);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shortUrl = `${baseUrl}/${hash}`;

    // 創建映射資料（在實際應用中會儲存到資料庫）
    const mapping = {
      id: hash,
      filename,
      url,
      shortUrl,
      createdAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      password: password || undefined,
    };

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
