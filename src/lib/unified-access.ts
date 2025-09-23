import { createClient, RedisClientType } from 'redis';

// 統一圖片存取入口介面
// 提供統一的圖片存取邏輯，支援快取、Edge 判斷和智慧路由
// 統一圖片存取入口介面
// 提供統一的圖片存取邏輯，支援快取、Edge 判斷和智慧路由

export interface ImageMapping {
  id: string; // Hash 值
  url: string; // 圖片 URL
  filename: string; // 原始檔名
  fileExtension?: string; // 檔案副檔名
  createdAt: Date; // 建立時間
  expiresAt?: Date; // 過期時間
  password?: string; // 密碼（雜湊後）
  shortUrl?: string; // 短網址
}

export interface ImageAccessRequest {
  hash: string; // 原始 hash（可能包含副檔名）
  headers: Record<string, string>; // 請求標頭
  query?: Record<string, string>; // 查詢參數
  userAgent?: string; // User-Agent
  referer?: string; // Referer
  ip?: string; // 客戶端 IP
}

export interface ImageAccessResponse {
  type: 'redirect' | 'json' | 'error' | 'direct';
  url?: string; // 重定向 URL
  data?: any; // JSON 資料
  statusCode?: number; // HTTP 狀態碼
  headers?: Record<string, string>; // 回應標頭
}

export interface EdgeDetectionResult {
  isBrowserRequest: boolean; // 是否為瀏覽器請求
  isImageRequest: boolean; // 是否為圖片請求
  isApiRequest: boolean; // 是否為 API 請求
  hasExtension: boolean; // 是否包含副檔名
  preferredContentType?: string; // 偏好的內容類型
  clientType: 'browser' | 'api' | 'crawler' | 'unknown'; // 客戶端類型
}

export interface CacheProvider {
  get(key: string): Promise<ImageMapping | null>;
  set(key: string, value: ImageMapping, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

// 抽象快取提供者 - 預留給 Redis/KV 等實作
export abstract class AbstractCacheProvider implements CacheProvider {
  abstract get(key: string): Promise<ImageMapping | null>;
  abstract set(key: string, value: ImageMapping, ttl?: number): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract exists(key: string): Promise<boolean>;
  abstract clear(): Promise<void>;
}

// 預設的記憶體快取實作（用於開發/測試）
export class MemoryCacheProvider extends AbstractCacheProvider {
  private cache = new Map<string, { data: ImageMapping; expires?: number }>();

  async get(key: string): Promise<ImageMapping | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    // 檢查是否過期
    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  async set(key: string, value: ImageMapping, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : undefined;
    this.cache.set(key, { data: value, expires });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

}

// Redis 快取提供者實作（用於生產環境）
export class RedisCacheProvider extends AbstractCacheProvider {
  private client: RedisClientType;
  private keyPrefix: string;
  private defaultTTL: number;
  private isConnected: boolean = false;

  constructor(options: {
    url?: string;
    password?: string;
    db?: number;
    keyPrefix?: string;
    defaultTTL?: number;
  } = {}) {
    super();
    this.keyPrefix = options.keyPrefix || 'upimg:';
    this.defaultTTL = options.defaultTTL || 86400; // 24小時

    // 建立 Redis 客戶端
    this.client = createClient({
      url: options.url || process.env.REDIS_URL || 'redis://localhost:6379',
      password: options.password || process.env.REDIS_PASSWORD || undefined,
      database: options.db || parseInt(process.env.REDIS_DB || '0'),
      socket: {
        connectTimeout: 60000,
        reconnectStrategy: (retries: number) => {
          // 檢查重試次數上限
          if (retries > 10) {
            console.error('Redis max retry attempts reached');
            return false;
          }

          // 線性退避策略，每次重試增加 100ms，最大 3 秒
          const delay = Math.min(retries * 100, 3000);

          // 添加隨機抖動避免驚群效應
          const jitter = Math.floor(Math.random() * 200);

          console.log(`Redis reconnect attempt ${retries}, delay: ${delay + jitter}ms`);
          return delay + jitter;
        }
      }
    });

    // 設定事件監聽
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis disconnected');
      this.isConnected = false;
    });
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  async get(key: string): Promise<ImageMapping | null> {
    try {
      await this.connect();
      const data = await this.client.get(this.getKey(key));
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      console.error('Redis get error:', error);
      // 如果 Redis 不可用，返回 null，讓系統降級到其他快取或資料庫
      return null;
    }
  }

  async set(key: string, value: ImageMapping, ttl?: number): Promise<void> {
    try {
      await this.connect();
      const serializedData = JSON.stringify(value);
      const effectiveTTL = ttl || this.defaultTTL;

      await this.client.setEx(this.getKey(key), effectiveTTL, serializedData);
    } catch (error) {
      console.error('Redis set error:', error);
      // 如果 Redis 不可用，靜默失敗，不拋出錯誤
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.connect();
      await this.client.del(this.getKey(key));
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.connect();
      // 刪除所有以 keyPrefix 開頭的鍵
      const keys = await this.client.keys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }

  // 取得快取統計資訊
  async getStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryUsage?: string;
  }> {
    try {
      await this.connect();
      const keys = await this.client.keys(`${this.keyPrefix}*`);
      const info = await this.client.info('memory');

      return {
        connected: this.isConnected,
        keyCount: keys.length,
        memoryUsage: info,
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return {
        connected: false,
        keyCount: 0,
      };
    }
  }

  // 健康檢查
  async ping(): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping error:', error);
      return false;
    }
  }
}

// Edge 判斷工具類
export class EdgeDetector {
  static detectEdge(request: ImageAccessRequest): EdgeDetectionResult {
    const { headers, hash } = request;
    const accept = headers.accept || headers.Accept || '';
    const userAgent = headers['user-agent'] || headers['User-Agent'] || '';

    // 檢查是否包含副檔名
    const hasExtension = hash.includes('.');

    // 判斷是否為瀏覽器請求
    const isBrowserRequest = accept.includes('text/html') ||
      userAgent.includes('Mozilla') && !userAgent.includes('curl') && !userAgent.includes('wget');

    // 判斷是否為圖片請求
    const isImageRequest = !isBrowserRequest && (
      accept.includes('image/') ||
      accept === '*/*' ||
      accept === ''
    );

    // 判斷是否為 API 請求
    const isApiRequest = accept.includes('application/json') ||
      userAgent.includes('curl') ||
      userAgent.includes('wget') ||
      userAgent.includes('Postman') ||
      userAgent.includes('axios');

    // 判斷客戶端類型
    let clientType: EdgeDetectionResult['clientType'] = 'unknown';
    if (isBrowserRequest) {
      clientType = 'browser';
    } else if (isApiRequest) {
      clientType = 'api';
    } else if (userAgent.includes('bot') || userAgent.includes('crawler')) {
      clientType = 'crawler';
    }

    // 解析偏好內容類型
    let preferredContentType: string | undefined;
    if (accept.includes('image/')) {
      const imageTypes = accept.split(',').filter(type => type.trim().startsWith('image/'));
      preferredContentType = imageTypes.length > 0 ? imageTypes[0].trim() : undefined;
    }

    return {
      isBrowserRequest,
      isImageRequest,
      isApiRequest,
      hasExtension,
      preferredContentType,
      clientType
    };
  }

  static isExpired(mapping: ImageMapping): boolean {
    return mapping.expiresAt ? new Date(mapping.expiresAt) < new Date() : false;
  }

  static requiresPassword(mapping: ImageMapping): boolean {
    return Boolean(mapping.password);
  }
}

// 統一圖片存取服務
export class UnifiedImageAccess {
  private cacheProvider: CacheProvider;
  private dataProvider: (hash: string) => Promise<ImageMapping | null>;

  constructor(
    cacheProvider: CacheProvider,
    dataProvider: (hash: string) => Promise<ImageMapping | null>
  ) {
    this.cacheProvider = cacheProvider;
    this.dataProvider = dataProvider;
  }

  async accessImage(request: ImageAccessRequest): Promise<ImageAccessResponse> {
    try {
      const { hash } = request;

      // 解析 hash 和副檔名
      const { hash: cleanHash, extension } = this.parseHashFilename(hash);

      // 驗證 hash 格式
      if (!this.isValidHash(cleanHash)) {
        return this.createRedirectResponse(`/${hash}`);
      }

      // 從快取獲取映射資料
      let mapping = await this.cacheProvider.get(cleanHash);

      // 如果快取中沒有，嘗試從資料來源獲取
      if (!mapping) {
        mapping = await this.dataProvider(cleanHash);

        // 如果找到資料，存入快取
        if (mapping) {
          await this.cacheProvider.set(cleanHash, mapping);
        }
      }

      // 如果映射不存在，返回重定向
      if (!mapping) {
        return this.createRedirectResponse(`/${hash}`);
      }

      // 檢查是否過期
      if (EdgeDetector.isExpired(mapping)) {
        // 清除過期快取
        await this.cacheProvider.delete(cleanHash);
        return this.createRedirectResponse(`/${hash}`);
      }

      // 執行 Edge 判斷和路由邏輯
      return this.handleRouting(request, mapping, extension);

    } catch (error) {
      console.error('Unified image access error:', error);
      return this.createRedirectResponse(`/${request.hash}`);
    }
  }

  private parseHashFilename(rawHash: string): { hash: string; extension?: string } {
    const lastDotIndex = rawHash.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return { hash: rawHash };
    }

    const hash = rawHash.substring(0, lastDotIndex);
    const extension = rawHash.substring(lastDotIndex + 1).toLowerCase();

    return { hash, extension };
  }

  private isValidHash(hash: string): boolean {
    // 支援多種長度：5字元以上，包含字母數字
    return /^[A-Za-z0-9]{5,}$/.test(hash);
  }

  private handleRouting(
    request: ImageAccessRequest,
    mapping: ImageMapping,
    extension?: string
  ): ImageAccessResponse {
    const edgeResult = EdgeDetector.detectEdge(request);

    console.log('Edge detection result:', edgeResult);

    // 如果帶副檔名：
    // - 瀏覽器請求 → 轉預覽頁
    // - 非瀏覽器/圖片請求 → 直出圖片
    if (extension && mapping.url) {
      if (edgeResult.isBrowserRequest) {
        const previewUrl = `/${request.hash.replace(/\.[^.]+$/, '')}/p`;
        return this.createRedirectResponse(previewUrl);
      }
      return this.createRedirectResponse(mapping.url);
    }

    // 無副檔名但為圖片請求 → 直出圖片
    if (!extension && edgeResult.isImageRequest && mapping.url) {
      return this.createRedirectResponse(mapping.url);
    }

    // 瀏覽器請求 → 預覽頁
    if (edgeResult.isBrowserRequest) {
      const previewUrl = `/${request.hash}/p`;
      return this.createRedirectResponse(previewUrl);
    }

    // 其他情況（API 請求），回傳 JSON 資料
    return {
      type: 'json',
      data: mapping,
      statusCode: 200
    };
  }

  private createRedirectResponse(url: string): ImageAccessResponse {
    return {
      type: 'redirect',
      url,
      statusCode: 302
    };
  }

  private createDirectResponse(url: string, mapping: ImageMapping): ImageAccessResponse {
    // 判斷是否為永久性內容（無過期時間或過期時間很長）
    const isImmutable = !mapping.expiresAt ||
      (new Date(mapping.expiresAt).getTime() - Date.now()) > (365 * 24 * 60 * 60 * 1000); // 超過一年

    const headers: Record<string, string> = {};

    if (isImmutable) {
      // 永久快取：1年
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      // 有過期時間：快取到過期前
      const maxAge = Math.max(0, Math.floor((new Date(mapping.expiresAt!).getTime() - Date.now()) / 1000));
      headers['Cache-Control'] = `public, max-age=${maxAge}`;
    }

    // 設定內容類型
    if (mapping.fileExtension) {
      const contentType = this.getContentType(mapping.fileExtension);
      if (contentType) {
        headers['Content-Type'] = contentType;
      }
    }

    return {
      type: 'direct',
      url,
      statusCode: 200,
      headers
    };
  }

  private getContentType(extension: string): string | undefined {
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',
      'tiff': 'image/tiff',
      'tif': 'image/tiff'
    };

    return contentTypes[extension.toLowerCase()];
  }

  // 快取管理方法
  async invalidateCache(hash: string): Promise<void> {
    await this.cacheProvider.delete(hash);
  }

  async clearCache(): Promise<void> {
    await this.cacheProvider.clear();
  }

  // 設定快取提供者（用於測試或動態切換）
  setCacheProvider(provider: CacheProvider): void {
    this.cacheProvider = provider;
  }
}