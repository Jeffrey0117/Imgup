import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createObjectCsvStringifier } from "csv-writer";
import { prisma } from "@/lib/prisma";
import { authenticateAdmin, getClientIp } from "@/utils/admin-auth";

type ExportFormat = "csv" | "excel";

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員身份
    const auth = await authenticateAdmin(request);

    // 解析查詢參數
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "csv") as ExportFormat;

    // 驗證格式參數
    if (!["csv", "excel"].includes(format)) {
      return NextResponse.json(
        { error: "無效的格式參數，支援 csv 或 excel" },
        { status: 400 }
      );
    }

    // 獲取客戶端 IP
    const clientIp = getClientIp(request);

    // 記錄審計日誌
    await prisma.auditLog.create({
      data: {
        adminId: auth.admin!.id,
        action: "EXPORT",
        entity: "mappings",
        entityId: "all", // 匯出所有記錄
        details: {
          format,
          userAgent: request.headers.get("user-agent") || null,
          timestamp: new Date().toISOString(),
        },
        ipAddress: clientIp,
      },
    });

    // 查詢所有活躍的映射記錄（不包含已刪除的）
    const mappings = await prisma.mapping.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        hash: true,
        filename: true,
        url: true,
        shortUrl: true,
        password: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 準備匯出資料
    const exportData = mappings.map((mapping) => ({
      hash: mapping.hash,
      shortUrl: mapping.shortUrl,
      url: mapping.url,
      filename: mapping.filename,
      password: mapping.password || "", // 空字串表示無密碼
      createdAt: mapping.createdAt.toISOString(),
      expiresAt: mapping.expiresAt ? mapping.expiresAt.toISOString() : "",
    }));

    // 根據格式生成檔案
    if (format === "csv") {
      // 生成 CSV
      const csvStringifier = createObjectCsvStringifier({
        header: [
          { id: "hash", title: "Hash" },
          { id: "shortUrl", title: "短網址" },
          { id: "url", title: "原始網址" },
          { id: "filename", title: "檔案名稱" },
          { id: "password", title: "密碼" },
          { id: "createdAt", title: "建立時間" },
          { id: "expiresAt", title: "到期時間" },
        ],
      });

      const csvContent =
        csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(exportData);

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="mappings_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === "excel") {
      // 生成 Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData, {
        header: [
          "hash",
          "shortUrl",
          "url",
          "filename",
          "password",
          "createdAt",
          "expiresAt",
        ],
      });

      // 設置欄位標題
      const headers = [
        "Hash",
        "短網址",
        "原始網址",
        "檔案名稱",
        "密碼",
        "建立時間",
        "到期時間",
      ];

      XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Mappings");

      // 生成 Excel 檔案
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="mappings_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    }

    // 不應該到達這裡
    return NextResponse.json({ error: "不支援的格式" }, { status: 400 });
  } catch (error: any) {
    // 處理認證錯誤
    if (error.status === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // 其他錯誤
    console.error("匯出映射資料失敗:", error);
    return NextResponse.json({ error: "匯出失敗" }, { status: 500 });
  }
}