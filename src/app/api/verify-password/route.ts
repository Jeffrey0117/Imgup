import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hash, password } = body;

    if (!hash || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 查找映射
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
      select: {
        password: true,
        expiresAt: true,
      }
    });

    if (!mapping) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 檢查是否過期
    if (mapping.expiresAt && new Date(mapping.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // 如果沒有設定密碼
    if (!mapping.password) {
      return NextResponse.json({ success: true });
    }

    // 驗證密碼
    const isValid = mapping.password === password;

    if (isValid) {
      // 設置 session cookie（簡單實作，實際應該用更安全的方式）
      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: `auth_${hash}`,
        value: "verified",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60, // 1小時
      });
      return response;
    } else {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("密碼驗證錯誤:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
