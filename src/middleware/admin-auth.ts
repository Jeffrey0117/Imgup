import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminSession,
  extractTokenFromRequest,
  getClientIp,
} from "@/utils/admin-auth";

export interface AdminAuthRequest extends NextRequest {
  admin?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
  sessionId?: string;
}

/**
 * 管理員認證中間件
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (req: AdminAuthRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // 提取 token
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "缺少認證 token" }, { status: 401 });
    }

    // 驗證 session
    const sessionResult = await verifyAdminSession(token);
    if (!sessionResult.valid || !sessionResult.admin) {
      return NextResponse.json({ error: "無效的認證 token" }, { status: 401 });
    }

    // 將管理員資訊附加到請求物件
    const authRequest = request as AdminAuthRequest;
    authRequest.admin = sessionResult.admin;
    authRequest.sessionId = sessionResult.sessionId;

    // 執行實際的處理函數
    return await handler(authRequest);
  } catch (error) {
    console.error("認證中間件錯誤:", error);
    return NextResponse.json({ error: "認證系統錯誤" }, { status: 500 });
  }
}

/**
 * 角色權限檢查中間件
 */
export function withRoleCheck(allowedRoles: string[]) {
  return function (
    request: NextRequest,
    handler: (req: AdminAuthRequest) => Promise<NextResponse>
  ) {
    return withAdminAuth(request, async (req: AdminAuthRequest) => {
      if (!req.admin) {
        return NextResponse.json({ error: "未認證" }, { status: 401 });
      }

      if (!allowedRoles.includes(req.admin.role)) {
        return NextResponse.json({ error: "權限不足" }, { status: 403 });
      }

      return await handler(req);
    });
  };
}

/**
 * IP 白名單檢查
 */
export function checkIPWhitelist(request: NextRequest): boolean {
  const clientIp = getClientIp(request);
  const whitelist = process.env.ADMIN_IP_WHITELIST?.split(",") || [];

  // 如果沒有設定白名單，則允許所有 IP
  if (whitelist.length === 0) {
    return true;
  }

  // 檢查是否在白名單中
  return whitelist.some((ip) => ip.trim() === clientIp);
}

/**
 * Rate Limiting (簡單實作)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  request: NextRequest,
  maxRequests = 100,
  windowMs = 15 * 60 * 1000
): boolean {
  const clientIp = getClientIp(request);
  const now = Date.now();

  const clientData = rateLimitMap.get(clientIp);

  if (!clientData) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > clientData.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (clientData.count >= maxRequests) {
    return false;
  }

  clientData.count++;
  return true;
}

/**
 * 完整的管理員 API 保護中間件
 */
export function protectAdminAPI(
  request: NextRequest,
  handler: (req: AdminAuthRequest) => Promise<NextResponse>,
  options?: {
    allowedRoles?: string[];
    checkIP?: boolean;
    rateLimit?: { max: number; windowMs: number };
  }
) {
  return async (): Promise<NextResponse> => {
    try {
      // IP 白名單檢查
      if (options?.checkIP && !checkIPWhitelist(request)) {
        return NextResponse.json(
          { error: "IP 地址不在允許範圍內" },
          { status: 403 }
        );
      }

      // Rate limiting 檢查
      if (options?.rateLimit) {
        const { max, windowMs } = options.rateLimit;
        if (!checkRateLimit(request, max, windowMs)) {
          return NextResponse.json(
            { error: "請求過於頻繁，請稍後再試" },
            { status: 429 }
          );
        }
      }

      // 角色權限檢查
      if (options?.allowedRoles) {
        return withRoleCheck(options.allowedRoles)(request, handler);
      }

      // 基本認證檢查
      return withAdminAuth(request, handler);
    } catch (error) {
      console.error("API 保護中間件錯誤:", error);
      return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
    }
  };
}

/**
 * 審計日誌記錄輔助函數
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: any,
  ipAddress?: string
) {
  try {
    const { prisma } = await import("@/lib/prisma");

    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        entity,
        entityId,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
        ipAddress: ipAddress || "127.0.0.1",
      },
    });
  } catch (error) {
    console.error("記錄審計日誌失敗:", error);
  }
}
