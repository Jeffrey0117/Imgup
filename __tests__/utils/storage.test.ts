import {
  saveImageMapping,
  getImageMapping,
  cleanExpiredMappings,
} from "../../src/utils/storage";
import type { UploadedImage } from "../../src/utils/storage";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock global localStorage
(global as any).localStorage = localStorageMock;

describe("Storage 工具函數測試", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("應該能保存圖片映射", () => {
    const mapping: UploadedImage = {
      id: "abc123",
      filename: "test.jpg",
      url: "https://example.com/test.jpg",
      shortUrl: "https://mysite.com/abc123",
      createdAt: new Date(),
    };

    expect(() => saveImageMapping(mapping)).not.toThrow();

    // 驗證是否保存到 localStorage (使用正確的 key)
    const stored = localStorage.getItem("upimg_mappings");
    expect(stored).toBeTruthy();

    // 驗證數據結構
    const parsedData = JSON.parse(stored!);
    expect(parsedData.abc123).toBeDefined();
    expect(parsedData.abc123.filename).toBe("test.jpg");
  });

  test("應該能獲取存在的圖片映射", () => {
    const mapping: UploadedImage = {
      id: "abc123",
      filename: "test.jpg",
      url: "https://example.com/test.jpg",
      shortUrl: "https://mysite.com/abc123",
      createdAt: new Date(),
    };

    saveImageMapping(mapping);
    const retrieved = getImageMapping("abc123");

    expect(retrieved).toBeTruthy();
    expect(retrieved?.id).toBe("abc123");
    expect(retrieved?.filename).toBe("test.jpg");
  });

  test("獲取不存在的映射應該返回 null", () => {
    const result = getImageMapping("nonexistent");
    expect(result).toBeNull();
  });

  test("應該能清理過期的映射", () => {
    const expiredMapping: UploadedImage = {
      id: "expired123",
      filename: "expired.jpg",
      url: "https://example.com/expired.jpg",
      shortUrl: "https://mysite.com/expired123",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() - 1000), // 已經過期
    };

    const validMapping: UploadedImage = {
      id: "valid123",
      filename: "valid.jpg",
      url: "https://example.com/valid.jpg",
      shortUrl: "https://mysite.com/valid123",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000), // 還沒過期
    };

    saveImageMapping(expiredMapping);
    saveImageMapping(validMapping);

    cleanExpiredMappings();

    // 過期的應該被清理
    expect(getImageMapping("expired123")).toBeNull();
    // 有效的應該保留
    expect(getImageMapping("valid123")).toBeTruthy();
  });

  test("保存帶密碼的映射", () => {
    const mappingWithPassword: UploadedImage = {
      id: "secure123",
      filename: "secure.jpg",
      url: "https://example.com/secure.jpg",
      shortUrl: "https://mysite.com/secure123",
      createdAt: new Date(),
      password: "mypassword",
    };

    saveImageMapping(mappingWithPassword);
    const retrieved = getImageMapping("secure123");

    expect(retrieved?.password).toBe("mypassword");
  });
});
