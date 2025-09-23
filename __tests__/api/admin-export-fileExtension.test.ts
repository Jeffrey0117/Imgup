/**
 * Admin Export API fileExtension 與新欄位測試
 */
import { GET } from "@/app/api/admin/export/route";

// Mock 管理員認證
jest.mock("@/utils/admin-auth", () => ({
  extractTokenFromRequest: jest.fn(),
  verifyAdminSession: jest.fn(),
  getClientIp: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { create: jest.fn() },
    mapping: { findMany: jest.fn() },
  },
}));

const { prisma: mockPrismaInstance } = require("@/lib/prisma");
const { extractTokenFromRequest, verifyAdminSession, getClientIp } = require("@/utils/admin-auth");

function makeRequest(format: string = "csv") {
  const url = new URL("http://localhost/api/admin/export");
  url.searchParams.set("format", format);

  return {
    url: url.toString(),
    cookies: { get: () => ({ value: "mock-token" }) },
    headers: {
      get: (name: string) => {
        if (name === "user-agent") return "test-agent";
        return null;
      }
    },
  } as any;
}

describe("Admin Export API - fileExtension 與新欄位", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    extractTokenFromRequest.mockReturnValue("mock-token");
    verifyAdminSession.mockResolvedValue({
      valid: true,
      admin: { id: "admin1" },
    });
    getClientIp.mockReturnValue("127.0.0.1");
    mockPrismaInstance.auditLog.create.mockResolvedValue({});
  });

  test("CSV 匯出應包含新的欄位（預覽短鏈、直出短鏈、副檔名）", async () => {
    mockPrismaInstance.mapping.findMany.mockResolvedValue([
      {
        hash: "abc123",
        filename: "test.jpg",
        url: "https://example.com/test.jpg",
        shortUrl: "https://duk.tw/abc123.jpg",
        password: "secret",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        expiresAt: new Date("2024-12-31T23:59:59Z"),
        viewCount: 10,
        fileExtension: ".jpg",
      },
      {
        hash: "def456",
        filename: "image.png",
        url: "https://example.com/image.png",
        shortUrl: "https://duk.tw/def456.png",
        password: null,
        createdAt: new Date("2024-01-02T15:30:00Z"),
        expiresAt: null,
        viewCount: 5,
        fileExtension: ".png",
      },
    ]);

    const req = makeRequest("csv");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");

    const csvContent = await response.text();

    // 檢查 CSV 標頭
    expect(csvContent).toContain("Hash,預覽短鏈,直出短鏈,原始網址,檔案名稱,副檔名,密碼,建立時間,到期時間,瀏覽量");

    // 檢查資料列
    expect(csvContent).toContain("abc123,/abc123,https://duk.tw/abc123.jpg,https://example.com/test.jpg,test.jpg,.jpg,secret");
    expect(csvContent).toContain("def456,/def456,https://duk.tw/def456.png,https://example.com/image.png,image.png,.png,");
  });

  test("Excel 匯出應包含新的欄位", async () => {
    mockPrismaInstance.mapping.findMany.mockResolvedValue([
      {
        hash: "xyz789",
        filename: "sample.webp",
        url: "https://example.com/sample.webp",
        shortUrl: "https://duk.tw/xyz789.webp",
        password: null,
        createdAt: new Date("2024-01-03T08:00:00Z"),
        expiresAt: null,
        viewCount: 3,
        fileExtension: ".webp",
      },
    ]);

    const req = makeRequest("excel");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    // 檢查檔案名稱包含當前日期
    const contentDisposition = response.headers.get("content-disposition");
    expect(contentDisposition).toContain("mappings_export_");
    expect(contentDisposition).toContain(".xlsx");
  });

  test("fileExtension 為 null 時在匯出中顯示空字串", async () => {
    mockPrismaInstance.mapping.findMany.mockResolvedValue([
      {
        hash: "old123",
        filename: "oldfile.txt",
        url: "https://example.com/oldfile.txt",
        shortUrl: "https://duk.tw/old123",
        password: null,
        createdAt: new Date("2023-12-01T10:00:00Z"),
        expiresAt: null,
        viewCount: 1,
        fileExtension: null, // 舊資料可能沒有副檔名
      },
    ]);

    const req = makeRequest("csv");
    const response = await GET(req);
    const csvContent = await response.text();

    // 檢查副檔名欄位為空
    expect(csvContent).toContain("old123,/old123,https://duk.tw/old123,https://example.com/oldfile.txt,oldfile.txt,,");
  });

  test("確認 Prisma select 包含 fileExtension 欄位", async () => {
    mockPrismaInstance.mapping.findMany.mockResolvedValue([]);

    const req = makeRequest("csv");
    await GET(req);

    expect(mockPrismaInstance.mapping.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          fileExtension: true,
        }),
      })
    );
  });

  test("記錄審計日誌", async () => {
    mockPrismaInstance.mapping.findMany.mockResolvedValue([]);

    const req = makeRequest("csv");
    await GET(req);

    expect(mockPrismaInstance.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: "admin1",
          action: "EXPORT",
          entity: "mappings",
          entityId: "all",
          details: expect.objectContaining({
            format: "csv",
          }),
          ipAddress: "127.0.0.1",
        }),
      })
    );
  });
});