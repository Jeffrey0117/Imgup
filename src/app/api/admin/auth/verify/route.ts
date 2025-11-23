import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminSession,
  extractTokenFromRequest,
  refreshTokens,
} from "@/utils/admin-auth";
import { logAdminAction } from "@/utils/secure-logger";

export async function GET(request: NextRequest) {
  try {
    // 從 cookie 或 header 中獲取 access token
    let token = extractTokenFromRequest(request);

    if (!token) {
      // 嘗試從 cookie 中獲取
      token = request.cookies.get("admin_token")?.value || null;
    }

    // 嘗試驗證 access token
    let result = token ? await verifyAdminSession(token) : { valid: false };

    // 如果 access token 無效，嘗試使用 refresh token
    if (!result.valid) {
      const refreshToken = request.cookies.get("admin_refresh_token")?.value;

      if (!refreshToken) {
        return NextResponse.json({ error: "缺少認證 token" }, { status: 401 });
      }

      // 使用 refresh token 獲取新的 tokens
      const refreshResult = await refreshTokens(refreshToken);

      if (!refreshResult.success || !refreshResult.data) {
        return NextResponse.json(
          { error: "認證已過期，請重新登入" },
          { status: 401 }
        );
      }

      // 驗證新的 access token
      result = await verifyAdminSession(refreshResult.data.accessToken);

      if (!result.valid || !result.admin) {
        return NextResponse.json({ error: "無效的認證 token" }, { status: 401 });
      }

      // 設定新的 cookies
      const response = NextResponse.json({
        valid: true,
        admin: result.admin,
        refreshed: true, // 標記此次響應進行了 token 刷新
      });

      const isProduction = process.env.NODE_ENV === "production";
      const cookieSameSite = "lax";
      const cookieSecure = false;

      // 設定新的 access token cookie (15 分鐘)
      response.cookies.set("admin_token", refreshResult.data.accessToken, {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite as "strict" | "lax",
        maxAge: 15 * 60,
        path: "/",
      });

      // 設定新的 refresh token cookie (7 天)
      response.cookies.set(
        "admin_refresh_token",
        refreshResult.data.refreshToken,
        {
          httpOnly: true,
          secure: cookieSecure,
          sameSite: cookieSameSite as "strict" | "lax",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        }
      );

      // 使用安全日誌記錄 token 刷新事件
      logAdminAction('token_refresh', {
        adminId: result.admin.id,
        refreshed: true,
      });

      return response;
    }

    // access token 有效，直接返回
    return NextResponse.json({
      valid: true,
      admin: result.admin,
    });
  } catch (error) {
    console.error("驗證 API 錯誤:", error);
    return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
  }
}
