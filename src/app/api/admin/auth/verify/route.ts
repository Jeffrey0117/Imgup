import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminSession,
  extractTokenFromRequest,
} from "@/utils/admin-auth";

export async function GET(request: NextRequest) {
  try {
    // 從 cookie 或 header 中獲取 token
    let token = extractTokenFromRequest(request);

    if (!token) {
      // 嘗試從 cookie 中獲取
      token = request.cookies.get("admin_token")?.value || null;
    }

    if (!token) {
      return NextResponse.json({ error: "缺少認證 token" }, { status: 401 });
    }

    // 驗證 session
    const result = await verifyAdminSession(token);

    if (!result.valid || !result.admin) {
      return NextResponse.json({ error: "無效的認證 token" }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      admin: result.admin,
    });
  } catch (error) {
    console.error("驗證 API 錯誤:", error);
    return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
  }
}
