import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

/**
 * CSRF Token 配置
 */
const CSRF_TOKEN_LENGTH = 32; // 32 bytes = 256 bits
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET!;

/**
 * 生成安全的 CSRF Token
 * 使用 crypto.randomBytes 生成加密安全的隨機 token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('base64url');
}

/**
 * 生成 CSRF Token 的 HMAC 簽名
 * 用於驗證 token 的真實性，防止偽造
 *
 * @param token - 要簽名的 CSRF token
 * @param sessionId - 綁定到特定 session
 */
export function signCsrfToken(token: string, sessionId: string): string {
  const hmac = createHmac('sha256', CSRF_SECRET);
  hmac.update(`${token}:${sessionId}`);
  return hmac.digest('base64url');
}

/**
 * 驗證 CSRF Token
 * 使用 timing-safe 比較防止 timing attack
 *
 * @param token - 從請求中提取的 CSRF token
 * @param signature - 從請求中提取的簽名
 * @param sessionId - 當前用戶的 session ID
 * @returns 是否驗證成功
 */
export function verifyCsrfToken(
  token: string | null,
  signature: string | null,
  sessionId: string
): boolean {
  // 檢查必要參數
  if (!token || !signature || !sessionId) {
    return false;
  }

  try {
    // 重新計算簽名
    const expectedSignature = signCsrfToken(token, sessionId);

    // 使用 timing-safe 比較，防止 timing attack
    const tokenBuffer = Buffer.from(token);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    // 檢查長度是否相同（timing-safe 比較要求長度一致）
    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
      return false;
    }

    // Timing-safe 比較
    return timingSafeEqual(signatureBuffer, expectedSignatureBuffer);
  } catch (error) {
    console.error('CSRF token 驗證錯誤:', error);
    return false;
  }
}

/**
 * 從請求 Header 中提取 CSRF Token
 * 支援多種 Header 名稱（符合業界標準）
 *
 * @param headers - Request headers
 * @returns CSRF token 或 null
 */
export function extractCsrfTokenFromHeaders(
  headers: Headers
): { token: string | null; signature: string | null } {
  // 常見的 CSRF token header 名稱
  const csrfHeaderNames = [
    'x-csrf-token',      // 最常用
    'x-xsrf-token',      // Angular 使用
    'csrf-token',        // 備選
  ];

  let token: string | null = null;

  // 嘗試從各種可能的 header 名稱中提取
  for (const headerName of csrfHeaderNames) {
    const value = headers.get(headerName);
    if (value) {
      token = value;
      break;
    }
  }

  // CSRF signature 從專用 header 提取
  const signature = headers.get('x-csrf-signature');

  return { token, signature };
}

/**
 * 產生 CSRF token pair（token + signature）
 * 這對值會在登入時生成並返回給前端
 *
 * @param sessionId - Session ID
 */
export function generateCsrfTokenPair(sessionId: string): {
  token: string;
  signature: string;
} {
  const token = generateCsrfToken();
  const signature = signCsrfToken(token, sessionId);

  return { token, signature };
}
