import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminSession,
  extractTokenFromRequest,
  getClientIp,
} from "@/utils/admin-auth";
import { hasPermission, getPermissionDescription } from "@/utils/rbac";
import {
  extractCsrfTokenFromHeaders,
  verifyCsrfToken,
} from "@/utils/csrf";
import { prisma } from "@/lib/prisma";

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
        // 記錄權限拒絕的審計日誌
        await logAdminAction(
          req.admin.id,
          "ROLE_DENIED",
          "access_control",
          undefined,
          {
            requiredRoles: allowedRoles,
            userRole: req.admin.role,
            endpoint: request.url,
            method: request.method,
          },
          getClientIp(request)
        );

        return NextResponse.json({ error: "權限不足" }, { status: 403 });
      }

      return await handler(req);
    });
  };
}

/**
 * 基於權限的檢查中間件（更細粒度的權限控制）
 */
export function withPermission(permission: string) {
  return function <T = any>(
    handler: (req: AdminAuthRequest, context?: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, context?: T): Promise<NextResponse> => {
      return withAdminAuth(request, async (req: AdminAuthRequest) => {
        if (!req.admin) {
          return NextResponse.json({ error: "未認證" }, { status: 401 });
        }

        // 檢查是否擁有指定權限
        if (!hasPermission(req.admin.role, permission)) {
          // 記錄權限拒絕的審計日誌
          await logAdminAction(
            req.admin.id,
            "PERMISSION_DENIED",
            "access_control",
            undefined,
            {
              requiredPermission: permission,
              permissionDescription: getPermissionDescription(permission),
              userRole: req.admin.role,
              endpoint: request.url,
              method: request.method,
            },
            getClientIp(request)
          );

          return NextResponse.json(
            {
              error: "權限不足",
              message: `此操作需要權限：${getPermissionDescription(permission)}`,
            },
            { status: 403 }
          );
        }

        return await handler(req, context);
      });
    };
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

/**
 * CSRF 保護中間件
 * 用於保護所有修改狀態的操作（POST, PUT, DELETE, PATCH）
 */
export async function withCsrfProtection(
  request: NextRequest,
  handler: (req: AdminAuthRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAdminAuth(request, async (req: AdminAuthRequest) => {
    try {
      // 檢查 HTTP 方法，只保護修改狀態的操作
      const method = request.method.toUpperCase();
      const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

      if (!protectedMethods.includes(method)) {
        // GET 和 HEAD 等安全方法不需要 CSRF 保護
        return await handler(req);
      }

      // 從 header 提取 CSRF token 和 signature
      const { token, signature } = extractCsrfTokenFromHeaders(request.headers);

      if (!token || !signature) {
        // 記錄 CSRF token 缺失的審計日誌
        if (req.admin) {
          await logAdminAction(
            req.admin.id,
            "CSRF_TOKEN_MISSING",
            "security",
            undefined,
            {
              endpoint: request.url,
              method: request.method,
              hasToken: !!token,
              hasSignature: !!signature,
            },
            getClientIp(request)
          );
        }

        return NextResponse.json(
          { error: "CSRF token 缺失，請求被拒絕" },
          { status: 403 }
        );
      }

      // 獲取 session ID（從認證中間件已驗證的資訊）
      if (!req.sessionId) {
        return NextResponse.json(
          { error: "Session ID 缺失" },
          { status: 401 }
        );
      }

      // 從資料庫獲取 session 以驗證 CSRF token
      const session = await prisma.adminSession.findUnique({
        where: { id: req.sessionId },
        select: {
          csrfToken: true,
          csrfSignature: true,
        },
      });

      if (!session || !session.csrfToken || !session.csrfSignature) {
        return NextResponse.json(
          { error: "CSRF token 未初始化" },
          { status: 403 }
        );
      }

      // 驗證提交的 token 是否與 session 中存儲的一致
      if (token !== session.csrfToken || signature !== session.csrfSignature) {
        // 記錄 CSRF 驗證失敗的審計日誌
        if (req.admin) {
          await logAdminAction(
            req.admin.id,
            "CSRF_VERIFICATION_FAILED",
            "security",
            undefined,
            {
              endpoint: request.url,
              method: request.method,
              reason: "Token 或 signature 不匹配",
            },
            getClientIp(request)
          );
        }

        return NextResponse.json(
          { error: "CSRF token 驗證失敗" },
          { status: 403 }
        );
      }

      // 雙重驗證：使用 HMAC 驗證簽名
      const isValid = verifyCsrfToken(token, signature, req.sessionId);

      if (!isValid) {
        // 記錄 CSRF 驗證失敗的審計日誌
        if (req.admin) {
          await logAdminAction(
            req.admin.id,
            "CSRF_SIGNATURE_INVALID",
            "security",
            undefined,
            {
              endpoint: request.url,
              method: request.method,
              reason: "HMAC 簽名驗證失敗",
            },
            getClientIp(request)
          );
        }

        return NextResponse.json(
          { error: "CSRF token 簽名無效" },
          { status: 403 }
        );
      }

      // CSRF 驗證通過，執行實際的處理函數
      return await handler(req);
    } catch (error) {
      console.error("CSRF 保護中間件錯誤:", error);
      return NextResponse.json(
        { error: "CSRF 驗證系統錯誤" },
        { status: 500 }
      );
    }
  });
}

/**
 * 結合權限檢查和 CSRF 保護的中間件
 * 用於需要同時進行權限控制和 CSRF 保護的路由
 */
export function withPermissionAndCsrf(permission: string) {
  return function <T = any>(
    handler: (req: AdminAuthRequest, context?: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, context?: T): Promise<NextResponse> => {
      // 先進行 CSRF 保護
      return withCsrfProtection(request, async (req: AdminAuthRequest) => {
        // 再進行權限檢查
        if (!req.admin) {
          return NextResponse.json({ error: "未認證" }, { status: 401 });
        }

        // 檢查是否擁有指定權限
        if (!hasPermission(req.admin.role, permission)) {
          // 記錄權限拒絕的審計日誌
          await logAdminAction(
            req.admin.id,
            "PERMISSION_DENIED",
            "access_control",
            undefined,
            {
              requiredPermission: permission,
              permissionDescription: getPermissionDescription(permission),
              userRole: req.admin.role,
              endpoint: request.url,
              method: request.method,
            },
            getClientIp(request)
          );

          return NextResponse.json(
            {
              error: "權限不足",
              message: `此操作需要權限：${getPermissionDescription(permission)}`,
            },
            { status: 403 }
          );
        }

        return await handler(req, context);
      });
    };
  };
}
