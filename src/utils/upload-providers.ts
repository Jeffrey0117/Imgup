// Upload Providers - 多 Provider 上傳系統

export interface UploadResult {
  url: string;              // 圖片 URL (用於儲存)
  directUrl?: string;       // 直接存取 URL
  previewUrl?: string;      // 預覽 URL
  deleteUrl?: string;       // 刪除 URL
  filename: string;         // 檔名
  mime?: string;            // MIME 類型
  provider: string;         // Provider 名稱
}

export interface UploadProvider {
  name: string;
  enabled: boolean;
  priority: number;
  upload: (file: File, filename: string) => Promise<UploadResult>;
}

// Urusai Provider (主要)
export class UrusaiProvider implements UploadProvider {
  name = 'urusai';
  enabled = true;
  priority = 1;

  async upload(file: File, filename: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file, filename);
    
    // 選填參數
    const token = process.env.URUSAI_TOKEN;
    const r18 = process.env.URUSAI_R18 || '0';
    
    if (token) {
      formData.append('token', token);
    }
    formData.append('r18', r18);

    const response = await fetch(
      process.env.URUSAI_API_ENDPOINT || 'https://api.urusai.cc/v1/upload',
      {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000), // 30 秒超時
      }
    );

    const raw = await response.text().catch(() => '');

    if (!response.ok) {
      const snippet = raw ? ` - ${raw.slice(0, 300)}` : '';
      throw new Error(`Urusai API error: ${response.status} ${response.statusText}${snippet}`);
    }

    let result: any;
    try {
      result = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(`Urusai API invalid JSON: ${raw.slice(0, 300)}`);
    }

    // 檢查回應格式
    if (result.status !== 'success' || !result.data) {
      const message = (result && (result.message || result.error)) || 'Unknown error';
      throw new Error(`Urusai API failed: ${message}`);
    }

    const { data } = result;

    return {
      url: data.url_direct || data.url_preview, // 優先使用直接 URL
      directUrl: data.url_direct,
      previewUrl: data.url_preview,
      deleteUrl: data.url_delete,
      filename: data.filename || filename,
      mime: data.mime,
      provider: this.name,
    };
  }
}

// Meteor Provider (備援)
export class MeteorProvider implements UploadProvider {
  name = 'meteor';
  enabled = process.env.ENABLE_METEOR_FALLBACK !== 'false';
  priority = 2;

  async upload(file: File, filename: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file, filename);

    const response = await fetch(
      'https://meteor.today/upload/upload_general_image',
      {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://meteor.today/p/times',
          Origin: 'https://meteor.today',
        },
        // Node/Edge 環境不需要 mode/credentials
        signal: AbortSignal.timeout(30000),
      }
    );

    const raw = await response.text().catch(() => '');

    if (!response.ok) {
      const snippet = raw ? ` - ${raw.slice(0, 300)}` : '';
      throw new Error(`Meteor API error: ${response.status}${snippet}`);
    }

    let result: any;
    try {
      result = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(`Meteor API invalid JSON: ${raw.slice(0, 300)}`);
    }

    const imageUrl = result.result;

    if (!imageUrl) {
      throw new Error('No image URL in meteor response');
    }

    return {
      url: imageUrl,
      directUrl: imageUrl,
      filename: filename,
      provider: this.name,
    };
  }
}

// Upload Manager - 管理多個 Provider
export class UploadManager {
  private providers: UploadProvider[] = [];

  constructor() {
    // 註冊 providers
    this.registerProvider(new UrusaiProvider());
    this.registerProvider(new MeteorProvider());

    // 根據優先順序排序
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  private registerProvider(provider: UploadProvider): void {
    if (provider.enabled) {
      this.providers.push(provider);
      console.log(`[UploadManager] Registered provider: ${provider.name}`);
    } else {
      console.log(`[UploadManager] Provider disabled: ${provider.name}`);
    }
  }

  async upload(file: File, filename: string, preferredProviderName?: string): Promise<UploadResult> {
    const providersToTry = this.getOrderedProviders(preferredProviderName);

    if (providersToTry.length === 0) {
      throw new Error('No upload providers available');
    }

    let lastError: any;

    for (const provider of providersToTry) {
      try {
        console.log(`[UploadManager] Trying provider: ${provider.name}`);
        const result = await provider.upload(file, filename);
        console.log(`[UploadManager] Success with provider: ${provider.name}`);
        return result;
      } catch (error) {
        console.error(`[UploadManager] Provider ${provider.name} failed:`, error);
        lastError = error;
        // 繼續嘗試下一個 provider
      }
    }

    // 所有 providers 都失敗
    throw lastError || new Error('All upload providers failed');
  }

  private getOrderedProviders(preferredProviderName?: string): UploadProvider[] {
    const ordered = [...this.providers];

    if (preferredProviderName) {
      const idx = ordered.findIndex(
        (p) => p.name.toLowerCase() === preferredProviderName.toLowerCase()
      );
      if (idx > -1) {
        const [preferred] = ordered.splice(idx, 1);
        ordered.unshift(preferred);
        console.log(`[UploadManager] Preferred provider set: ${preferred.name}`);
      } else {
        console.log(`[UploadManager] Preferred provider not found: ${preferredProviderName}`);
      }
    }

    return ordered;
  }

  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }
}