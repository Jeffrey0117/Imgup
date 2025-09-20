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

export function generateShortHash(input: string, length: number = 6): string {
  console.log("hash.ts - generateShortHash 輸入:", {
    input,
    input_length: input.length,
    input_type: typeof input,
    target_length: length,
  });

  // 確保長度在 5-6 字元範圍內
  const targetLength = Math.max(5, Math.min(6, length));

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

  // 生成指定長度的 base62 編碼
  let out = "";
  for (let i = 0; i < targetLength; i++) {
    const n = next();
    out += BASE62_CHARS[n % BASE62_CHARS.length];
  }

  console.log("hash.ts - generateShortHash 輸出:", {
    final_hash: out,
    actual_length: out.length,
    target_length: targetLength,
  });

  return out;
}

// 新增防碰撞版本的 hash 生成函數
export async function generateUniqueHash(
  input: string,
  checkExists: (hash: string) => Promise<boolean>,
  maxRetries: number = 10
): Promise<string> {
  let attempt = 0;
  let baseInput = input;

  while (attempt < maxRetries) {
    // 基於嘗試次數調整輸入，增加變異性
    const saltedInput = attempt === 0 ? baseInput : `${baseInput}_${attempt}`;
    const hash = generateShortHash(saltedInput, 6);

    console.log("防碰撞檢查:", {
      attempt: attempt + 1,
      hash,
      saltedInput:
        saltedInput !== baseInput
          ? saltedInput.substring(0, 50) + "..."
          : saltedInput.substring(0, 50),
    });

    // 檢查是否已存在
    const exists = await checkExists(hash);
    if (!exists) {
      console.log("找到唯一 hash:", { hash, attempts: attempt + 1 });
      return hash;
    }

    attempt++;
  }

  // 如果所有嘗試都失敗，回退到時間戳版本
  const timestampHash = generateShortHash(`${baseInput}_${Date.now()}`, 6);
  console.warn("使用時間戳回退 hash:", { hash: timestampHash, maxRetries });
  return timestampHash;
}

export function isValidHash(hash: string): boolean {
  // 支援多種長度：5-6字元（新版本）、8字元（舊測試）、11字元（舊版本）
  return /^[A-Za-z0-9]{5,6}$|^[A-Za-z0-9]{8}$|^[A-Za-z0-9]{11}$/.test(hash);
}
