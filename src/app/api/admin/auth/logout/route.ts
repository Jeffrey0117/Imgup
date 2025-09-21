import { NextRequest, NextResponse } from "next/server";
import { logoutAdmin } from "@/utils/admin-auth";
import { withAdminAuth, AdminAuthRequest } from "@/middleware/admin-auth";

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (req: AdminAuthRequest) => {
    try {
      if (!req.sessionId) {
        return NextResponse.json({ error: "無效的會話" }, { status: 400 });
      }

      // 執行登出
      const result = await logoutAdmin(req.sessionId);

      if (!result.success) {
        return NextResponse.json({ error: "登出失敗" }, { status: 500 });
      }

      // 清除 cookies
      const response = NextResponse.json({ success: true });

      response.cookies.set("admin_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });

      response.cookies.set("admin_refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });

      return response;
    } catch (error) {
      console.error("登出 API 錯誤:", error);
      return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
    }
  });
}
