import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractTokenFromRequest,
  verifyAdminSession,
} from "@/utils/admin-auth";

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

    // AND 條件集合
    const AND: any[] = [];
    const now = new Date();

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

    const where = AND.length ? { AND } : undefined;

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
      },
    });

    const data = (items as Item[]).map((m: Item) => ({
      id: m.id,
      hash: m.hash,
      filename: m.filename,
      url: m.url,
      shortUrl: m.shortUrl,
      createdAt: m.createdAt.toISOString(),
      expiresAt: m.expiresAt ? m.expiresAt.toISOString() : null,
      viewCount: m.viewCount,
      isDeleted: m.isDeleted,
      deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
      isExpired: m.expiresAt ? m.expiresAt < now : false,
      hasPassword: !!m.password,
      // 不回傳密碼本體
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      success: true,
      data: {
        items: data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("取得映射列表失敗:", error);
    return NextResponse.json({ error: "取得列表失敗" }, { status: 500 });
  }
}
