// Hash 生成工具
export function generateShortHash(input: string): string {
  console.log("hash.ts - generateShortHash 輸入:", {
    input: input,
    input_length: input.length,
    input_type: typeof input,
  });

  // 使用簡單的 hash 算法生成短 ID
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let hash = 0;

  // 簡單的字串 hash
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 轉換為 32bit 整數
  }

  console.log("hash.ts - 中間 hash 值:", { intermediate_hash: hash });

  // 轉換為正數並生成短 ID
  hash = Math.abs(hash);
  let result = "";
  // 改為只生成 4 個字符
  for (let i = 0; i < 4; i++) {
    result += characters[hash % characters.length];
    hash = Math.floor(hash / characters.length);
  }

  // 加上更短的時間戳確保唯一性（只取最後 2 位）
  const timestamp = Date.now().toString(36);
  const finalHash = result + timestamp.slice(-2);

  console.log("hash.ts - generateShortHash 輸出:", {
    result_part: result,
    timestamp_part: timestamp.slice(-2),
    final_hash: finalHash,
    timestamp_now: new Date().toISOString(),
  });

  return finalHash;
}

export function isValidHash(hash: string): boolean {
  // 檢查 hash 是否符合格式（5-8個字元，包含字母和數字）
  return /^[A-Za-z0-9]{5,8}$/.test(hash);
}
