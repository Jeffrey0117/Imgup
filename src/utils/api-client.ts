/**
 * Admin API 客戶端工具
 * 自動處理 CSRF token 和錯誤處理
 */

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_SIGNATURE_KEY = 'csrf_signature';

/**
 * 從 localStorage 獲取 CSRF tokens
 */
function getCsrfTokens(): { token: string | null; signature: string | null } {
  if (typeof window === 'undefined') {
    return { token: null, signature: null };
  }

  return {
    token: localStorage.getItem(CSRF_TOKEN_KEY),
    signature: localStorage.getItem(CSRF_SIGNATURE_KEY),
  };
}

/**
 * 儲存 CSRF tokens 到 localStorage
 */
export function saveCsrfTokens(token: string, signature: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(CSRF_TOKEN_KEY, token);
  localStorage.setItem(CSRF_SIGNATURE_KEY, signature);
}

/**
 * 清除 CSRF tokens
 */
export function clearCsrfTokens(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CSRF_TOKEN_KEY);
  localStorage.removeItem(CSRF_SIGNATURE_KEY);
}

/**
 * 增強的 fetch 函數，自動附加 CSRF tokens
 * 用於所有 admin API 請求
 */
export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

  // 如果是需要保護的方法，附加 CSRF tokens
  if (protectedMethods.includes(method)) {
    const { token, signature } = getCsrfTokens();

    if (token && signature) {
      // 創建新的 headers 對象
      const headers = new Headers(options.headers || {});

      // 附加 CSRF tokens
      headers.set('X-CSRF-Token', token);
      headers.set('X-CSRF-Signature', signature);

      options.headers = headers;
    } else {
      console.warn('CSRF tokens 缺失，請求可能會被拒絕');
    }
  }

  // 確保包含 credentials
  if (!options.credentials) {
    options.credentials = 'include';
  }

  // 發送請求
  const response = await fetch(url, options);

  // 如果收到 401，可能需要重新登入
  if (response.status === 401) {
    // 清除 CSRF tokens
    clearCsrfTokens();

    // 可以在這裡觸發重新登入流程
    if (typeof window !== 'undefined') {
      // 跳轉到登入頁面（如果不是已經在登入頁面）
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/admin-new/login';
      }
    }
  }

  // 如果收到 403 CSRF 錯誤，可能需要重新獲取 CSRF token
  if (response.status === 403) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.error?.includes('CSRF')) {
      console.error('CSRF 驗證失敗，請重新登入');
      clearCsrfTokens();
    }
  }

  return response;
}

/**
 * 便捷的 API 調用函數
 */
export const api = {
  /**
   * GET 請求
   */
  get: async (url: string, options: RequestInit = {}) => {
    return adminFetch(url, {
      ...options,
      method: 'GET',
    });
  },

  /**
   * POST 請求
   */
  post: async (url: string, data?: any, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (data && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return adminFetch(url, {
      ...options,
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PUT 請求
   */
  put: async (url: string, data?: any, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (data && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return adminFetch(url, {
      ...options,
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PATCH 請求
   */
  patch: async (url: string, data?: any, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (data && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return adminFetch(url, {
      ...options,
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * DELETE 請求
   */
  delete: async (url: string, data?: any, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (data && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return adminFetch(url, {
      ...options,
      method: 'DELETE',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};
