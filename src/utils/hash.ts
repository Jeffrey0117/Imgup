// Hash 生成工具
export function generateShortHash(url: string): string {
  // 使用簡單的 hash 算法生成短 ID
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let hash = 0;

  // 簡單的字串 hash
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 轉換為 32bit 整數
  }

  // 轉換為正數並生成短 ID
  hash = Math.abs(hash);
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += characters[hash % characters.length];
    hash = Math.floor(hash / characters.length);
  }

  // 加上時間戳確保唯一性
  const timestamp = Date.now().toString(36);
  return result + timestamp.slice(-3);
}

export function isValidHash(hash: string): boolean {
  // 檢查 hash 是否符合格式（8-12個字元，包含字母和數字）
  return /^[A-Za-z0-9]{8,12}$/.test(hash);
}
