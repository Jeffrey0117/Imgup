/**
 * 管理員相關型別定義
 */

/**
 * Admin JWT Token Payload
 */
export interface AdminTokenPayload {
  adminId: string;
  email: string;
  username: string;
  role: string;
  sessionId: string;
}

/**
 * Admin 資料型別
 */
export interface AdminData {
  id: string;
  email: string;
  username: string;
  role: string;
}

/**
 * Admin 登入結果
 */
export interface LoginResult {
  success: boolean;
  data?: {
    admin: AdminData;
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

/**
 * Admin Session 驗證結果
 */
export interface AdminSessionResult {
  valid: boolean;
  admin?: AdminData;
  sessionId?: string;
}
