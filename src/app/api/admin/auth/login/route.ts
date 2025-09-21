import { NextRequest, NextResponse } from "next/server";
import { loginAdmin, getClientIp } from "@/utils/admin-auth";

export async function POST(request: NextRequest) {
  try {
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

    // 設定 access token cookie (15 分鐘)
    response.cookies.set("admin_token", result.data!.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60, // 15 分鐘
      path: "/",
    });

    // 設定 refresh token cookie (7 天)
    response.cookies.set("admin_refresh_token", result.data!.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 天
      path: "/",
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
