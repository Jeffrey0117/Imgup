import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";
import { getBatchViewCounts } from "@/lib/view-count-helper";

type StatusFilter = "valid" | "expired" | "deleted";

type Item = {
  id: string;
  hash: string;
  filename: string;
  url: string;
  shortUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
  password: string | null;
  viewCount: number;
  isDeleted: boolean;
  deletedAt: Date | null;
  logs: { createdAt: Date }[];
  referrerStats: { refererDomain: string | null; accessCount: number }[];
};

function parseBool(value: string | null): boolean | null {
  if (value === null) return null;
  const v = value.toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員身份（支援 Header Bearer 與 Cookie）
    let token = extractTokenFromRequest(request);
    if (!token) {
      token = request.cookies.get("admin_token")?.value || null;
      if (!token) {
        const cookieHeader = request.headers.get("cookie");
        if (cookieHeader) {
          const cookies = cookieHeader.split(";").map((c) => c.trim());
          for (const cookie of cookies) {
            if (cookie.startsWith("admin_token=")) {
              token = cookie.split("=")[1];
              break;
            }
          }
        }
      }
    }

    if (!token) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    const auth = await verifyAdminSession(token);
    if (!auth.valid) {
      return NextResponse.json({ error: "身份驗證失敗" }, { status: 401 });
    }

    // 解析查詢參數
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids")?.split(",").filter(Boolean) || null; // 批量查詢支援
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );
    const search = searchParams.get("search")?.trim() || "";
    const dateStart = searchParams.get("dateStart");
    const dateEnd = searchParams.get("dateEnd");
    const status = (searchParams.get("status") as StatusFilter | null) || null; // valid | expired | deleted
    const passwordProtected = parseBool(searchParams.get("passwordProtected")); // true | false | null
    const minViews = searchParams.get("minViews") ? parseInt(searchParams.get("minViews")!, 10) : null;
    const maxViews = searchParams.get("maxViews") ? parseInt(searchParams.get("maxViews")!, 10) : null;
    const fileType = searchParams.get("fileType")?.trim() || "";
    const includeStats = parseBool(searchParams.get("includeStats")); // 是否包含統計資訊

    // 當提供 ids 參數時，忽略其他篩選條件，只查詢指定項目
    let where: any = undefined;
    const now = new Date();

    if (ids) {
      // 批量查詢模式：只查詢指定 ID 的項目
      where = { id: { in: ids } };
    } else {
      // 一般查詢模式：使用所有篩選條件
      const AND: any[] = [];

      // 狀態篩選
      if (status === "deleted") {
        AND.push({ isDeleted: true });
      } else {
        // 預設不顯示已刪除
        AND.push({ isDeleted: false });
        if (status === "valid") {
          AND.push({
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          });
        } else if (status === "expired") {
          AND.push({ expiresAt: { lt: now } });
        }
      }

      // 檔名搜尋（不分大小寫）
      if (search) {
        AND.push({ filename: { contains: search, mode: "insensitive" } });
      }

      // 日期範圍（createdAt）
      if (dateStart || dateEnd) {
        const createdAtRange: any = {};
        if (dateStart) createdAtRange.gte = new Date(dateStart);
        if (dateEnd) {
          const end = new Date(dateEnd);
          end.setHours(23, 59, 59, 999);
          createdAtRange.lte = end;
        }
        AND.push({ createdAt: createdAtRange });
      }

      // 密碼保護狀態
      if (passwordProtected !== null) {
        if (passwordProtected === true) {
          AND.push({ password: { not: null } });
        } else {
          AND.push({ OR: [{ password: null }, { password: "" }] });
        }
      }

      // 瀏覽量範圍篩選
      if (minViews !== null || maxViews !== null) {
        const viewCountRange: any = {};
        if (minViews !== null) viewCountRange.gte = minViews;
        if (maxViews !== null) viewCountRange.lte = maxViews;
        AND.push({ viewCount: viewCountRange });
      }

      // 檔案類型篩選（依副檔名）
      if (fileType) {
        AND.push({ filename: { endsWith: `.${fileType}`, mode: "insensitive" } });
      }

      where = AND.length ? { AND } : undefined;
    }

    // 查詢總數
    const total = await prisma.mapping.count({ where });

    // 分頁查詢
    const items = await prisma.mapping.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        hash: true,
        filename: true,
        url: true,
        shortUrl: true,
        createdAt: true,
        expiresAt: true,
        password: true,
        viewCount: true,
        isDeleted: true,
        deletedAt: true,
        logs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            createdAt: true,
          },
        },
        referrerStats: {
          orderBy: { accessCount: "desc" },
          take: 3,
          select: {
            refererDomain: true,
            accessCount: true,
          },
        },
      },
    });

    // 批量獲取實時 viewCount（從 Redis，降級到 DB 快照）
    const viewCountResults = await getBatchViewCounts(
      (items as Item[]).map((m: Item) => ({
        hash: m.hash,
        dbSnapshot: m.viewCount  // DB 快照值作為降級選項
      }))
    );

    const data = (items as Item[]).map((m: Item) => {
      const viewCountResult = viewCountResults.get(m.hash);
      return {
        id: m.id,
        hash: m.hash,
        filename: m.filename,
        url: m.url,
        shortUrl: m.shortUrl,
        createdAt: m.createdAt.toISOString(),
        expiresAt: m.expiresAt ? m.expiresAt.toISOString() : null,
        viewCount: viewCountResult?.viewCount || m.viewCount,  // Redis 優先，降級到 DB
        isDeleted: m.isDeleted,
        deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
        isExpired: m.expiresAt ? m.expiresAt < now : false,
        hasPassword: !!m.password,
        password: m.password, // Admin API 可以回傳實際密碼值
        lastAccessedAt: m.logs.length > 0 ? m.logs[0].createdAt.toISOString() : null,
        topReferrers: m.referrerStats.map((r) => ({
          domain: r.refererDomain || "Direct",
          count: r.accessCount,
        })),
      };
    });

    let pagination;
    if (ids) {
      // 批量查詢模式：回傳實際找到的項目數量
      pagination = {
        page: 1,
        pageSize: data.length,
        total: data.length,
        totalPages: 1,
      };
    } else {
      // 一般查詢模式：標準分頁
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      pagination = {
        page,
        pageSize,
        total,
        totalPages,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        items: data,
        pagination,
      },
    });
  } catch (error) {
    console.error("取得映射列表失敗:", error);
    return NextResponse.json({ error: "取得列表失敗" }, { status: 500 });
  }
}