import { generateApiSignature } from './api-security';

/**
 * 安全的 API 客戶端
 * 自動處理請求簽名和安全標頭
 */
export class SecureApiClient {
  private baseUrl: string;
  private requestId: number = 0;
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '';
  }
  
  /**
   * 發送安全的 API 請求
   */
  async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const timestamp = Date.now();
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : undefined;
    
    // 生成請求簽名（在實際應用中，密鑰應該安全地傳遞）
    const signature = await this.generateClientSignature(method, path, timestamp, body);
    
    // 添加安全標頭
    const headers = new Headers(options.headers);
    headers.set('x-api-signature', signature);
    headers.set('x-api-timestamp', timestamp.toString());
    headers.set('x-request-id', `${timestamp}-${++this.requestId}`);
    
    // 添加防偵測標頭
    if (typeof window !== 'undefined' && (window as any).__DEV_TOOLS_OPEN__) {
      headers.set('x-dev-tools', 'detected');
    }
    
    try {
      const response = await fetch(this.baseUrl + path, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Secure API request failed:', error);
      throw error;
    }
  }
  
  /**
   * 客戶端簽名生成（簡化版本）
   */
  private async generateClientSignature(
    method: string,
    path: string,
    timestamp: number,
    body?: any
  ): Promise<string> {
    // 在實際應用中，這應該使用安全的方式獲取密鑰
    // 這裡只是示例
    const payload = `${method}:${path}:${timestamp}:${body ? JSON.stringify(body) : ''}`;
    
    // 使用簡單的 hash（實際應用需要更安全的方式）
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      // 瀏覽器環境：使用 Web Crypto API
      return await this.browserHash(payload);
    }
    
    // 後備方案：簡單 hash
    return this.simpleHash(payload);
  }
  
  /**
   * 瀏覽器端 hash
   */
  private async browserHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * 簡單 hash（後備方案）
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  /**
   * GET 請求
   */
  async get<T = any>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }
  
  /**
   * POST 請求
   */
  async post<T = any>(path: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }
  
  /**
   * PUT 請求
   */
  async put<T = any>(path: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }
  
  /**
   * DELETE 請求
   */
  async delete<T = any>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

// 單例模式
let apiClientInstance: SecureApiClient | null = null;

export function getApiClient(): SecureApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new SecureApiClient();
  }
  return apiClientInstance;
}

/**
 * 混淆 API 呼叫（增加分析難度）
 */
export function obfuscateApiCall<T = any>(
  fn: () => Promise<T>,
  minDelay: number = 100,
  maxDelay: number = 500
): Promise<T> {
  return new Promise((resolve, reject) => {
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}

/**
 * 批次請求（減少 API 呼叫次數）
 */
export class ApiBatcher {
  private queue: Array<{
    path: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private timer: NodeJS.Timeout | null = null;
  private client: SecureApiClient;
  
  constructor(client?: SecureApiClient) {
    this.client = client || getApiClient();
  }
  
  add<T = any>(path: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ path, resolve, reject });
      this.scheduleBatch();
    });
  }
  
  private scheduleBatch() {
    if (this.timer) return;
    
    this.timer = setTimeout(() => {
      this.executeBatch();
    }, 50); // 50ms 延遲批次處理
  }
  
  private async executeBatch() {
    const batch = [...this.queue];
    this.queue = [];
    this.timer = null;
    
    if (batch.length === 0) return;
    
    try {
      // 發送批次請求
      const results = await this.client.post('/api/batch', {
        requests: batch.map(item => ({ path: item.path })),
      });
      
      // 分發結果
      batch.forEach((item, index) => {
        if (results[index]?.success) {
          item.resolve(results[index].data);
        } else {
          item.reject(results[index]?.error || 'Batch request failed');
        }
      });
    } catch (error) {
      // 所有請求都失敗
      batch.forEach(item => item.reject(error));
    }
  }
}