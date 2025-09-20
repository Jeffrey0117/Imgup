// Hash 生成工具

const BASE62_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function xorshift32(seed: number): () => number {
  let x = seed >>> 0;
  if (x === 0) x = 0x9e3779b9; // 使種子非 0
  return function next() {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return x >>> 0;
  };
}

export function generateShortHash(input: string): string {
  console.log("hash.ts - generateShortHash 輸入:", {
    input,
    input_length: input.length,
    input_type: typeof input,
  });

  // 兩路 32-bit 混合哈希（可重現，無時間因子）
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }

  // 最終擾動並確保為無號整數
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 13)) >>> 0;

  // 使用 XOR 組合為種子
  let seed = (h1 ^ h2) >>> 0;
  if (seed === 0) seed = 0x9e3779b9;
  const next = xorshift32(seed);

  // 固定輸出 11 個英數字（base62）
  let out = "";
  for (let i = 0; i < 11; i++) {
    const n = next();
    out += BASE62_CHARS[n % BASE62_CHARS.length];
  }

  console.log("hash.ts - generateShortHash 輸出:", {
    final_hash: out,
  });

  return out;
}

export function isValidHash(hash: string): boolean {
  // 測試相容：允許 8 碼（舊資料/測試）或 11 碼（新產生）
  return /^(?:[A-Za-z0-9]{8}|[A-Za-z0-9]{11})$/.test(hash);
}
