import { NextRequest, NextResponse } from "next/server";
import { loginAdmin, getClientIp } from "@/utils/admin-auth";
import {
  validateRequestOrigin,
  detectAutomation,
  checkRateLimit,
  getRandomDelay
} from "@/utils/api-security";

export async function POST(request: NextRequest) {
  try {
    // 安全檢查 1：驗證請求來源
    if (!validateRequestOrigin(request)) {
      return NextResponse.json(
        { error: "無效的請求來源" },
        { status: 403 }
      );
    }
    
    // 安全檢查 2：偵測自動化工具
    if (detectAutomation(request)) {
      return NextResponse.json(
        { error: "偵測到自動化存取" },
        { status: 403 }
      );
    }
    
    // 安全檢查 3：速率限制（每分鐘最多 5 次登入嘗試）
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`login:${clientIp}`, 5, 60000)) {
      return NextResponse.json(
        { error: "登入嘗試過於頻繁，請稍後再試" },
        { status: 429 }
      );
    }
    
    // 添加隨機延遲，防止時序分析
    await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
    
    const body = await request.json();

    // 基本驗證
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "請提供電子郵件和密碼" },
        { status: 400 }
      );
    }

    const { email, password } = body;
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = getClientIp(request);

    // 執行登入
    const result = await loginAdmin(email, password, userAgent, ipAddress);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // 設定 HTTP-only cookies
    const response = NextResponse.json({
      success: true,
      admin: result.data!.admin,
    });

    // Cookie 安全設定：生產環境強制使用 HTTPS
    const isProduction = process.env.NODE_ENV === "production";
    const cookieSameSite = "lax"; // lax 以支援跨請求
    const cookieSecure = isProduction; // 生產環境強制 secure (HTTPS only)

    // 設定 access token cookie (15 分鐘)
    response.cookies.set("admin_token", result.data!.accessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite as "strict" | "lax",
      maxAge: 15 * 60, // 15 分鐘
      path: "/",
    });

    // 設定 refresh token cookie (7 天)
    response.cookies.set("admin_refresh_token", result.data!.refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite as "strict" | "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 天
      path: "/",
    });

    console.log("🔐 登入 API:", {
      email,
      success: true,
      nodeEnv: process.env.NODE_ENV,
      isProduction,
      cookieSecure,
      cookieSameSite,
      adminTokenLength: result.data!.accessToken.length,
      refreshTokenLength: result.data!.refreshToken.length,
    });

    return response;
  } catch (error) {
    console.error("登入 API 錯誤:", error);
    return NextResponse.json(
      { error: "系統錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}