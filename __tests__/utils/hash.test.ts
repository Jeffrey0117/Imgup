import { generateShortHash, isValidHash } from "../../src/utils/hash";

describe("Hash 生成函數測試", () => {
  test("應該為不同的 URL 生成不同的 hash", () => {
    const url1 = "https://example.com/image1.jpg";
    const url2 = "https://example.com/image2.jpg";

    const hash1 = generateShortHash(url1);
    const hash2 = generateShortHash(url2);

    expect(hash1).not.toEqual(hash2);
    expect(hash1).toHaveLength(11);
    expect(hash2).toHaveLength(11);
  });

  test("相同的 URL 應該生成相同的 hash", () => {
    const url = "https://example.com/image.jpg";

    const hash1 = generateShortHash(url);
    const hash2 = generateShortHash(url);

    expect(hash1).toEqual(hash2);
  });

  test("生成的 hash 應該只包含字母數字", () => {
    const url = "https://example.com/image.jpg";
    const hash = generateShortHash(url);

    expect(hash).toMatch(/^[a-zA-Z0-9]+$/);
  });

  test("isValidHash 應該正確驗證 hash 格式", () => {
    expect(isValidHash("abc123de")).toBe(true);
    expect(isValidHash("ABC123DE")).toBe(true);
    expect(isValidHash("12345678")).toBe(true);

    expect(isValidHash("abc")).toBe(false); // 太短
    expect(isValidHash("abc123de12345")).toBe(false); // 太長 (13字符)
    expect(isValidHash("abc-123")).toBe(false); // 包含特殊字符
    expect(isValidHash("")).toBe(false); // 空字符串
  });
});
