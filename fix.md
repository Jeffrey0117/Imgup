# 整合 Urusai API 上傳圖片 - 方案 C 實作

## Urusai API 規格

### API 資訊
- **端點**: `https://api.urusai.cc/v1/upload`
- **方法**: `POST`
- **格式**: `multipart/form-data`
- **檔案限制**: 單檔最大 50MB

### 請求參數
- `file` (必要): 要上傳的檔案
- `token` (選填): 存取憑證,未提供則匿名上傳
- `r18` (選填): `1` = R18, `0` = 非 R18 (預設)

### 回應格式
```json
{
  "status": "success",
  "message": "uploaded",
  "data": {
    "id": "shine",
    "r18": "0",
    "filename": "urusai.png",
    "url_preview": "https://i.urusai.cc/shine",
    "url_direct": "https://i.urusai.cc/shine.png",
    "url_delete": "https://urusai.cc/del/abcd1234",
    "mime": "image/png"
  }
}
```

## 方案 C: 多 Provider 實作

### 架構設計

```
┌─────────────────┐
│  Upload Route   │
│  /api/upload    │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│  Upload Manager         │
│  依序嘗試 providers     │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
    ↓         ↓
┌─────────┐ ┌─────────┐
│ Urusai  │ │ Meteor  │
│Provider │ │Provider │
│(主要)   │ │(備援)   │
└─────────┘ └─────────┘
```

### 環境變數設定

**新增到 `.env.local`**:
```env
# Urusai API (主要上傳服務)
URUSAI_API_ENDPOINT=https://api.urusai.cc/v1/upload
URUSAI_TOKEN=your_token_here  # 選填,不填則匿名上傳
URUSAI_R18=0  # 預設非 R18

# Meteor API (備援)
ENABLE_METEOR_FALLBACK=true

# Provider 優先順序 (逗號分隔)
UPLOAD_PROVIDER_PRIORITY=urusai,meteor
```

## 實作代碼

### 1. 建立 Provider 抽象層

**新增檔案**: `src/utils/upload-providers.ts`

```typescript
// src/utils/upload-providers.ts

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

// Urusai Provider
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

    if (!response.ok) {
      throw new Error(`Urusai API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // 檢查回應格式
    if (result.status !== 'success' || !result.data) {
      throw new Error(`Urusai API failed: ${result.message || 'Unknown error'}`);
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
        mode: 'cors',
        credentials: 'include',
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      throw new Error(`Meteor API error: ${response.status}`);
    }

    const result = await response.json();
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

// Upload Manager
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

  async upload(file: File, filename: string): Promise<UploadResult> {
    if (this.providers.length === 0) {
      throw new Error('No upload providers available');
    }

    let lastError: any;

    for (const provider of this.providers) {
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

  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }
}
```

### 2. 修改上傳 Route

**修改檔案**: `src/app/api/upload/route.ts`

在檔案開頭新增 import:
```typescript
import { UploadManager } from '@/utils/upload-providers';
```

替換步驟 8-11 的上傳邏輯 (136-203 行):

```typescript
// 步驟 8: 使用 Upload Manager 上傳
console.log(`[Upload] Processing file: ${safeFileName} (${image.size} bytes) from ${clientIP}`);

const uploadManager = new UploadManager();
console.log(`[Upload] Available providers: ${uploadManager.getAvailableProviders().join(', ')}`);

let uploadResult;
try {
  uploadResult = await uploadManager.upload(image, safeFileName);
  console.log(`[Upload] Upload result:`, {
    provider: uploadResult.provider,
    url: uploadResult.url,
    filename: uploadResult.filename,
  });
} catch (uploadError) {
  console.error('[Upload] All providers failed:', uploadError);
  await logUploadAttempt(clientIP, false, 'Upload failed', userAgent);
  return NextResponse.json(
    {
      status: 0,
      message: 'Upload failed. Please try again later.',
    },
    { status: 500 }
  );
}

// 記錄成功的上傳
await logUploadAttempt(clientIP, true, `Success via ${uploadResult.provider}`, userAgent);

// 步驟 9: 提取圖片 URL
const imageUrl = uploadResult.url;
if (!imageUrl) {
  await logUploadAttempt(clientIP, false, 'No image URL in response', userAgent);
  return NextResponse.json(
    {
      status: 0,
      message: "Upload service returned no image URL",
    },
    { status: 500 }
  );
}

// 步驟 10: 檢測檔案副檔名
const fileExtension = detectFileExtensionComprehensive(
  uploadResult.mime || image.type, 
  imageUrl
);
console.log(`[Upload] Detected file extension: ${fileExtension}`);

// 其餘邏輯保持不變 (hash 生成、資料庫儲存...)
```

### 3. 更新資料庫 Schema (選用)

如果要儲存額外的 Urusai 資訊 (預覽 URL、刪除 URL):

**修改**: `prisma/schema.prisma`

```prisma
model Mapping {
  id              Int       @id @default(autoincrement())
  hash            String    @unique
  url             String    // 主要 URL
  filename        String
  shortUrl        String
  createdAt       DateTime  @default(now())
  expiresAt       DateTime?
  password        String?
  fileExtension   String?
  
  // 新增欄位 (選填)
  directUrl       String?   // Urusai 直接 URL
  previewUrl      String?   // Urusai 預覽 URL
  deleteUrl       String?   // Urusai 刪除 URL
  uploadProvider  String?   // 使用的 provider
  
  @@index([hash])
  @@index([expiresAt])
}
```

然後在上傳邏輯中新增:

```typescript
const mappingData = {
  hash,
  url: imageUrl,
  filename: safeFileName,
  shortUrl,
  createdAt: new Date(),
  password: password || null,
  expiresAt: expiresAt ? new Date(expiresAt) : null,
  fileExtension: fileExtension || null,
  
  // 新增欄位
  directUrl: uploadResult.directUrl || null,
  previewUrl: uploadResult.previewUrl || null,
  deleteUrl: uploadResult.deleteUrl || null,
  uploadProvider: uploadResult.provider,
};
```

## 測試計畫

### 1. 單元測試 (本地)

```bash
# 測試 Urusai API
curl -X POST https://api.urusai.cc/v1/upload \
  -F "file=@test.png" \
  -F "r18=0"

# 預期回應
{
  "status": "success",
  "message": "uploaded",
  "data": { ... }
}
```

### 2. 整合測試

**測試案例**:

| 測試項目 | 步驟 | 預期結果 |
|---------|------|---------|
| **Urusai 成功** | 正常上傳 | 使用 Urusai, 返回 `url_direct` |
| **Urusai 失敗 → Meteor 成功** | 停用 Urusai token | 自動降級到 Meteor |
| **所有失敗** | 兩個 API 都停用 | 返回 500 錯誤 |
| **大檔案** | 上傳 51MB 檔案 | Urusai 拒絕, 降級或失敗 |
| **Token 驗證** | 使用/不使用 token | 兩種情況都能成功 |

### 3. 壓力測試

```bash
# 連續上傳 10 張圖片
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/upload \
    -F "image=@test.png" \
    -F "password=" \
    -F "expiresAt="
  sleep 1
done
```

## 部署檢查清單

### 1. 環境變數設定

**Vercel Dashboard**:
```
URUSAI_API_ENDPOINT = https://api.urusai.cc/v1/upload
URUSAI_TOKEN = (選填,留空則匿名)
URUSAI_R18 = 0
ENABLE_METEOR_FALLBACK = true
```

### 2. 檔案清單

- [x] 新增 `src/utils/upload-providers.ts`
- [x] 修改 `src/app/api/upload/route.ts`
- [ ] (選用) 修改 `prisma/schema.prisma`
- [ ] 更新 `.env.example`

### 3. 部署流程

```bash
# 1. 提交代碼
git add .
git commit -m "feat(upload): 整合 Urusai API 並實作多 provider fallback"
git push

# 2. Vercel 會自動部署

# 3. 驗證部署
curl -X POST https://duk.tw/api/upload \
  -F "image=@test.png"
```

### 4. 監控

**關鍵指標**:
- Urusai 成功率
- Meteor fallback 觸發頻率
- 平均上傳時間
- 錯誤率

**Vercel Logs**:
```
[UploadManager] Trying provider: urusai
[UploadManager] Success with provider: urusai
```

## 優勢總結

### ✅ 方案 C 的優點

1. **高可用性**: Urusai 失效時自動降級到 Meteor
2. **易擴展**: 未來可輕鬆新增更多 provider (Imgur, Cloudinary...)
3. **監控友善**: 清楚記錄每個 provider 的使用情況
4. **設定靈活**: 透過環境變數控制優先順序

### 📊 與現有系統的整合

- ✅ 保留所有現有功能 (密碼、過期、hash 生成)
- ✅ 不影響前端邏輯
- ✅ 智慧路由完全相容
- ✅ 資料庫結構向下相容

### 🎯 額外功能

**Urusai 提供的額外資訊**:
- `url_direct`: 直接圖片 URL (用於嵌入)
- `url_preview`: 預覽頁面 URL
- `url_delete`: 刪除連結 (可實作刪除功能)

## 實作時間估計

| 階段 | 時間 | 說明 |
|-----|------|------|
| **建立 Provider 層** | 1-2 小時 | 新增 `upload-providers.ts` |
| **修改 Upload Route** | 30 分鐘 | 整合 UploadManager |
| **本地測試** | 30 分鐘 | 驗證基本功能 |
| **更新 Schema** (選用) | 30 分鐘 | 儲存額外資訊 |
| **部署與驗證** | 30 分鐘 | Production 測試 |
| **總計** | **3-4 小時** | |

## 立即開始

**下一步**: 執行以下指令建立檔案並開始實作

```bash
# 1. 建立 upload-providers.ts
touch src/utils/upload-providers.ts

# 2. 設定環境變數
echo "URUSAI_API_ENDPOINT=https://api.urusai.cc/v1/upload" >> .env.local
echo "URUSAI_TOKEN=" >> .env.local
echo "URUSAI_R18=0" >> .env.local
echo "ENABLE_METEOR_FALLBACK=true" >> .env.local
```

準備好後我會開始實作程式碼。