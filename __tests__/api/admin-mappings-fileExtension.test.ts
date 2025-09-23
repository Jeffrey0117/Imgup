/**
 * Admin Mappings API fileExtension 欄位測試
 */
import { GET } from "@/app/api/admin/mappings/route";

// Mock 管理員認證
jest.mock("@/utils/admin-auth", () => ({
  extractTokenFromRequest: jest.fn(),
  verifyAdminSession: jest.fn(),
}));

// Mock Prisma
const mockPrismaInstance = {
  mapping: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrismaInstance,
}));

const { extractTokenFromRequest, verifyAdminSession } = require("@/utils/admin-auth");

function makeRequest(searchParams: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/admin/mappings");
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    url: url.toString(),
    cookies: { get: () => ({ value: "mock-token" }) },
    headers: { get: () => null },
  } as any;
}

describe("Admin Mappings API - fileExtension 欄位", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    extractTokenFromRequest.mockReturnValue("mock-token");
    verifyAdminSession.mockResolvedValue({
      valid: true,
      admin: { id: "admin1" },
    });
  });

  test("回傳的資料應包含 fileExtension 欄位", async () => {
    mockPrismaInstance.mapping.count.mockResolvedValue(2);
    mockPrismaInstance.mapping.findMany.mockResolvedValue([
      {
        id: "1",
        hash: "abc123",
        filename: "test.jpg",
        url: "https://example.com/test.jpg",
        shortUrl: "https://duk.tw/abc123.jpg",
        createdAt: new Date("2024-01-01"),
        expiresAt: null,
        password: null,
        viewCount: 5,
        isDeleted: false,
        deletedAt: null,
        fileExtension: ".jpg",
      },
      {
        id: "2",
        hash: "def456",
        filename: "image.png",
        url: "https://example.com/image.png",
        shortUrl: "https://duk.tw/def456.png",
        createdAt: new Date("2024-01-02"),
        expiresAt: null,
        password: "secret",
        viewCount: 10,
        isDeleted: false,
        deletedAt: null,
        fileExtension: ".png",
      },
    ]);

    const req = makeRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.items).toHaveLength(2);

    // 檢查第一筆資料的 fileExtension
    expect(data.data.items[0]).toMatchObject({
      id: "1",
      hash: "abc123",
      filename: "test.jpg",
      fileExtension: ".jpg",
    });

    // 檢查第二筆資料的 fileExtension
    expect(data.data.items[1]).toMatchObject({
      id: "2",
      hash: "def456",
      filename: "image.png",
      fileExtension: ".png",
    });
  });

  test("fileExtension 為 null 時應正確處理", async () => {
    mockPrismaInstance.mapping.count.mockResolvedValue(1);
    mockPrismaInstance.mapping.findMany.mockResolvedValue([
      {
        id: "3",
        hash: "ghi789",
        filename: "oldfile.txt",
        url: "https://example.com/oldfile.txt",
        shortUrl: "https://duk.tw/ghi789",
        createdAt: new Date("2023-12-01"),
        expiresAt: null,
        password: null,
        viewCount: 1,
        isDeleted: false,
        deletedAt: null,
        fileExtension: null, // 舊資料可能沒有副檔名
      },
    ]);

    const req = makeRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.items[0]).toMatchObject({
      id: "3",
      hash: "ghi789",
      filename: "oldfile.txt",
      fileExtension: null,
    });
  });

  test("確認 Prisma select 包含 fileExtension 欄位", async () => {
    mockPrismaInstance.mapping.count.mockResolvedValue(0);
    mockPrismaInstance.mapping.findMany.mockResolvedValue([]);

    const req = makeRequest();
    await GET(req);

    expect(mockPrismaInstance.mapping.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          fileExtension: true,
        }),
      })
    );
  });
});