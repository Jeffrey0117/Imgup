# PTT 圖片嵌入顯示不穩定問題分析

## 問題描述
在 PTT 網頁（如 https://www.ptt.cc/bbs/MacShop/M.1759396154.A.115.html）中，使用 duk.tw 上傳的圖片有時能自動嵌入顯示，有時卻無法顯示。用戶提到每次修改圖片路由邏輯後，顯示就會變得不穩定。

## 根本原因分析

### 1. PTT 圖片嵌入機制
PTT 使用以下邏輯判斷是否將連結轉換為嵌入圖片：
- 檢查 URL 是否指向圖片資源
- 透過 HTTP HEAD 請求檢查 `Content-Type`
- 檢查 URL 是否包含圖片副檔名（`.jpg`, `.png`, `.gif`, `.webp` 等）

### 2. duk.tw 短網址的問題
**核心問題**：duk.tw 的短網址格式為 `https://duk.tw/{hash}`，**沒有圖片副檔名**。

例如：
- ❌ `https://duk.tw/abc123` - 無副檔名，PTT 無法快速判斷
- ✅ `https://duk.tw/abc123.jpg` - 有副檔名，PTT 直接識別

### 3. 顯示不穩定的原因

#### 情境 A：能顯示的情況
1. PTT 發送 HEAD 請求到 `https://duk.tw/abc123`
2. duk.tw 的 Edge 判斷邏輯**正確**回傳 `Content-Type: image/jpeg`
3. PTT 收到圖片 Content-Type，自動嵌入顯示

#### 情境 B：無法顯示的情況
1. PTT 發送 HEAD 請求到 `https://duk.tw/abc123`
2. duk.tw 的 Edge 判斷邏輯**失誤**，回傳 `Content-Type: text/html`（因為判斷為網頁預覽）
3. PTT 收到 HTML Content-Type，**不嵌入**，僅顯示超連結

### 4. Edge 判斷邏輯的脆弱性

檢查 `src/lib/unified-access.ts:200-316` 的判斷邏輯：

```typescript
// 舊邏輯（可能不穩定）
if (isImageRequest(request)) {
  // 回傳圖片
} else {
  // 回傳網頁預覽
}
```

**問題點**：
- `isImageRequest()` 依賴 `Accept` header 判斷
- 某些情境下（如 PTT 爬蟲、不同瀏覽器）可能回傳錯誤的 Content-Type
- 缺少**副檔名優先判斷**邏輯

## 已實施的修復方案

### 修復 Commit: `810addc`
**標題**：`fix(ptt): 修復 PTT 嵌入圖片顯示不穩定問題 - 優先判斷圖片副檔名`

**核心改進**：在 `src/lib/unified-access.ts:315-316` 新增 `hasImageExtension` 判斷

```typescript
const pathname = new URL(request.url).pathname;
const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i.test(pathname);

// 優先檢查副檔名
if (hasImageExtension) {
  // 強制回傳圖片，不管 Accept header
  return await handleImageResponse(mapping, hash);
}

// 再檢查 Accept header
if (isImageRequest(request)) {
  return await handleImageResponse(mapping, hash);
}

// 最後回傳網頁預覽
return await handlePreviewResponse(mapping, hash, password);
```

### 修復效果
✅ **帶副檔名的短網址**（如 `https://duk.tw/abc123.jpg`）：
- 100% 穩定顯示
- PTT 直接識別為圖片
- Edge 邏輯優先判斷副檔名，強制回傳圖片

⚠️ **無副檔名的短網址**（如 `https://duk.tw/abc123`）：
- 依賴 `isImageRequest(request)` 判斷
- 某些情境下仍可能不穩定

## 完整解決方案建議

### 方案 A：強制帶副檔名（建議）
**修改上傳 API**，短網址生成時自動附加副檔名：

```typescript
// src/app/api/upload/route.ts
const extension = getFileExtension(image.name);
const shortUrl = `${baseUrl}/${hash}${extension}`; // 強制帶副檔名
```

**優點**：
- PTT 100% 穩定顯示
- 不依賴 Edge 判斷邏輯
- 符合業界標準（Imgur、ImgBB 都帶副檔名）

**缺點**：
- 短網址變長（但可接受）

### 方案 B：保持雙路由（當前狀態）
維持兩種短網址格式：
- `https://duk.tw/abc123` - 可能不穩定
- `https://duk.tw/abc123.jpg` - 穩定

**優點**：
- 相容舊連結
- 彈性高

**缺點**：
- 用戶可能選錯格式
- 需要教育用戶「PTT 請用帶副檔名的連結」

### 方案 C：Edge 邏輯完全重寫
移除 `Accept` header 判斷，改為：
1. **優先判斷副檔名**
2. **查詢資料庫 `fileExtension` 欄位**
3. 預設回傳圖片，除非明確要求預覽頁

**優點**：
- 最穩定
- 不依賴 HTTP header

**缺點**：
- 需要重寫 unified-access.ts
- 需要確保資料庫 `fileExtension` 欄位完整

## 建議行動方案

### 立即執行（推薦方案 A）
1. 修改 `src/app/api/upload/route.ts`，強制短網址帶副檔名
2. 更新前端顯示邏輯，優先展示帶副檔名的短網址
3. 文件說明：「PTT 使用請複製帶副檔名的連結」

### 程式碼修改範例

**檔案**：`src/app/api/upload/route.ts:210-212`

```typescript
// 修改前
const shortUrl = result.extension
  ? `${window.location.origin}/${hash}${result.extension}`
  : `${window.location.origin}/${hash}`;

// 修改後（強制帶副檔名）
const extension = result.extension || getFileExtension(image.name);
const shortUrl = `${window.location.origin}/${hash}${extension}`;
```

## 測試驗證

### 測試步驟
1. 上傳圖片到 duk.tw
2. 取得短網址（確認有副檔名）
3. 在 PTT 發文區貼上短網址
4. 預覽時確認圖片自動嵌入顯示

### 預期結果
- ✅ `https://duk.tw/abc123.jpg` → PTT 自動嵌入圖片
- ✅ `https://duk.tw/abc123.png` → PTT 自動嵌入圖片
- ✅ 不再出現「有時能顯示、有時不能」的情況

## 結論

**問題根源**：duk.tw 短網址缺少副檔名 + Edge 判斷邏輯依賴不穩定的 `Accept` header

**最佳解法**：強制短網址帶副檔名（方案 A）

**已修復部分**：Edge 邏輯新增 `hasImageExtension` 優先判斷（commit 810addc）

**待執行**：前端 API 強制生成帶副檔名的短網址（建議立即實施）

---

## 新問題：帶密碼的圖片直接顯示圖片內容

### 問題描述
- **URL**: `https://duk.tw/6U4jvP.jpg`
- **預期行為**：應該先要求輸入密碼才能查看圖片
- **實際行為**：瀏覽器直接顯示圖片內容，繞過密碼保護

### 根本原因分析

#### 1. 路由處理順序問題
當前 `[hash]/page.tsx` 的處理邏輯：

```typescript
// src/app/[hash]/page.tsx:1-35
export default async function SmartRoutePage({ params }: Props) {
  const rawHash = params.hash;
  const hashWithoutExt = rawHash.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');
  
  // 檢查資料庫
  const mapping = await prisma.mapping.findUnique({
    where: { hash: hashWithoutExt },
  });
  
  // 直接 redirect 到 /p，沒有檢查密碼
  redirect(`/${hashWithoutExt}/p`);
}
```

**問題**：
1. `[hash]/page.tsx` 只做資料庫驗證與過期檢查
2. **沒有檢查密碼欄位**
3. 直接 redirect 到 `/p` 頁面，導致流程繞過密碼驗證

#### 2. Smart Route API 的漏洞
`/api/smart-route/[hash]/route.ts` 雖然有密碼檢查：

```typescript
// src/app/api/smart-route/[hash]/route.ts:244-263
if (mapping?.password) {
  const authCookie = cookies.get(`auth_${cleanedHash}`);
  const referer = req.headers.get('referer') || '';
  const isFromPreviewPage = referer.includes(`/${cleanedHash}/p`);
  
  if (!authCookie || authCookie.value !== 'verified') {
    if (!isFromPreviewPage) {
      return NextResponse.redirect(new URL(`/${cleanedHash}/p`, req.url), {
        status: 302,
      });
    }
  }
}
```

**但是**：
- Smart Route API 主要處理 **API 請求**（如 PTT 爬蟲、圖片嵌入）
- 當用戶 **直接在瀏覽器輸入** `https://duk.tw/6U4jvP.jpg`，會先經過 `[hash]/page.tsx`
- `[hash]/page.tsx` 沒有密碼檢查，直接 redirect 到 `/p`
- `/p` 頁面再檢查 cookie，但此時用戶已經看到預覽頁面內容

### 修復方案

#### 方案 A：在 `[hash]/page.tsx` 加入密碼檢查（推薦）

**修改位置**：`src/app/[hash]/page.tsx:1-35`

```typescript
import { redirect, notFound } from "next/navigation";
import { isValidHash } from "../../utils/hash";
import prisma from "@/lib/prisma";
import { cookies } from 'next/headers';

export default async function SmartRoutePage({ params }: Props) {
  const rawHash = params.hash;
  const hashWithoutExt = rawHash.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');
  
  if (!isValidHash(hashWithoutExt)) {
    redirect("/");
  }

  const mapping = await prisma.mapping.findUnique({
    where: { hash: hashWithoutExt },
  });

  if (!mapping) {
    notFound();
  }

  if (mapping.expiresAt && mapping.expiresAt < new Date()) {
    notFound();
  }

  // 🔒 密碼檢查 - 關鍵修復
  if (mapping.password) {
    const cookieStore = cookies();
    const authCookie = cookieStore.get(`auth_${hashWithoutExt}`);
    
    // 如果沒有驗證 cookie，強制導向預覽頁面要求輸入密碼
    if (!authCookie || authCookie.value !== 'verified') {
      redirect(`/${hashWithoutExt}/p`);
    }
  }

  // 預設行為是重定向到預覽頁面
  redirect(`/${hashWithoutExt}/p`);
}
```

**優點**：
- ✅ 最小改動
- ✅ 在進入 `/p` 頁面前就攔截
- ✅ 保持現有 Smart Route API 邏輯不變

**缺點**：
- ⚠️ 需要在兩個地方維護密碼檢查邏輯（`[hash]/page.tsx` + `smart-route/[hash]/route.ts`）

### 建議實施方案

**推薦：方案 A（最快實施）**

1. 修改 `src/app/[hash]/page.tsx`，加入密碼檢查
2. 確保 cookie 驗證邏輯與 Smart Route API 一致
3. 測試流程：
   - 上傳帶密碼的圖片
   - 訪問 `https://duk.tw/{hash}.jpg`
   - 確認被導向 `/p` 頁面並要求輸入密碼
   - 輸入密碼後才能查看圖片

### 測試案例

#### 測試 1：帶密碼 + 帶副檔名
- **URL**：`https://duk.tw/6U4jvP.jpg`
- **預期**：導向 `/6U4jvP/p`，要求輸入密碼
- **實際**：（待修復後測試）

#### 測試 2：帶密碼 + 無副檔名
- **URL**：`https://duk.tw/6U4jvP`
- **預期**：導向 `/6U4jvP/p`，要求輸入密碼
- **實際**：（待修復後測試）

### 結論

**新問題根源**：`[hash]/page.tsx` 沒有檢查密碼欄位，直接 redirect 導致繞過密碼保護

**最佳解法**：方案 A - 在 `[hash]/page.tsx` 加入密碼檢查

**立即行動**：修改 `src/app/[hash]/page.tsx:25-35`，加入密碼驗證邏輯

---

## 完整路由策略規劃：密碼保護 vs 論壇嵌入

### 衝突分析

#### 目前行為
1. **帶副檔名 URL**（如 `https://duk.tw/6U4jvP.jpg`）
   - `[hash]/page.tsx` 處理：直接 redirect 到 `/p` 預覽頁
   - 結果：瀏覽器顯示預覽頁（HTML），**不是圖片**

2. **論壇嵌入需求**（PTT、巴哈）
   - 論壇爬蟲發送請求：`Accept: image/*` 或 HEAD 請求
   - 需要回應：`Content-Type: image/jpeg` + 圖片二進位內容
   - **不能**回應 HTML 或 redirect

3. **密碼保護需求**
   - 有密碼的圖片不應直接暴露
   - 需要先驗證 cookie 或導向密碼表單

#### 根本矛盾
- **論壇嵌入**：需要 **直接回傳圖片**（不檢查密碼）
- **密碼保護**：需要 **攔截請求**（檢查密碼）

### 解決策略：User-Agent 與 Accept Header 區分

#### 核心邏輯
```
if (帶副檔名) {
  if (Accept: image/* 或 HEAD 請求) {
    // 論壇爬蟲或 <img> 嵌入
    if (有密碼) {
      ❌ 回傳 403 Forbidden（保護圖片）
    } else {
      ✅ 回傳圖片（支援論壇嵌入）
    }
  } else {
    // 瀏覽器直接訪問
    if (有密碼) {
      if (cookie 驗證通過) {
        redirect 到 /p（顯示預覽頁）
      } else {
        redirect 到 /p（顯示密碼表單）
      }
    } else {
      redirect 到 /p（顯示預覽頁）
    }
  }
}
```

### 路由處理方案（完整版）

#### 選項 1：`[hash]/page.tsx` 處理所有邏輯（不推薦）

**問題**：
- `[hash]/page.tsx` 是 **React Server Component**，只能 `redirect()`
- **無法**直接回傳圖片二進位內容
- **無法**設定 `Content-Type: image/jpeg`

#### 選項 2：Middleware 重寫到 Smart Route API（推薦）

**實施步驟**：

1. **Middleware 攔截所有 `/{hash}.ext` 請求**
   ```typescript
   // middleware.ts
   export function middleware(request: NextRequest) {
     const pathname = request.nextUrl.pathname;
     
     // 檢查是否為帶副檔名的短網址
     const match = pathname.match(/^\/([a-zA-Z0-9]+)\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i);
     if (match) {
       const [, hash, ext] = match;
       // Rewrite 到 Smart Route API
       return NextResponse.rewrite(new URL(`/api/smart-route/${hash}.${ext}`, request.url));
     }
     
     return NextResponse.next();
   }
   ```

2. **Smart Route API 統一處理**
   ```typescript
   // src/app/api/smart-route/[hash]/route.ts
   export async function GET(req: NextRequest, { params }: { params: { hash: string } }) {
     const cleanedHash = params.hash.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');
     const hasExtension = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(params.hash);
     
     // 查詢資料庫
     const mapping = await prisma.mapping.findUnique({ where: { hash: cleanedHash } });
     
     if (!mapping) return notFound();
     if (mapping.expiresAt && mapping.expiresAt < new Date()) return notFound();
     
     // 判斷請求類型
     const accept = req.headers.get('accept') || '';
     const isImageRequest = accept.includes('image/') || req.method === 'HEAD';
     
     // 🔒 密碼保護邏輯
     if (mapping.password) {
       const authCookie = req.cookies.get(`auth_${cleanedHash}`);
       
       if (isImageRequest) {
         // 論壇爬蟲或 <img> 嵌入：拒絕訪問
         return new NextResponse('Protected image', { status: 403 });
       } else {
         // 瀏覽器訪問：導向密碼頁面
         if (!authCookie || authCookie.value !== 'verified') {
           return NextResponse.redirect(new URL(`/${cleanedHash}/p`, req.url));
         }
       }
     }
     
     // 無密碼或已驗證
     if (isImageRequest && hasExtension) {
       // 回傳圖片（代理模式）
       const imageResponse = await fetch(mapping.url);
       return new NextResponse(imageResponse.body, {
         headers: {
           'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
           'Cache-Control': 'public, max-age=31536000',
         }
       });
     } else {
       // 回傳預覽頁
       return NextResponse.redirect(new URL(`/${cleanedHash}/p`, req.url));
     }
   }
   ```

3. **`[hash]/page.tsx` 簡化**
   ```typescript
   // src/app/[hash]/page.tsx
   export default async function SmartRoutePage({ params }: Props) {
     // 只處理無副檔名的請求
     const hashWithoutExt = params.hash.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');
     
     // 所有邏輯都導向 /p
     redirect(`/${hashWithoutExt}/p`);
   }
   ```

### 行為對照表

| 情境 | URL | 請求類型 | 有密碼 | Cookie | 行為 |
|------|-----|----------|--------|--------|------|
| PTT 嵌入 | `duk.tw/abc.jpg` | `Accept: image/*` | ❌ | - | ✅ 回傳圖片 |
| PTT 嵌入 | `duk.tw/abc.jpg` | `Accept: image/*` | ✅ | - | ❌ 403 Forbidden |
| 瀏覽器訪問 | `duk.tw/abc.jpg` | `Accept: text/html` | ❌ | - | redirect → `/abc/p` |
| 瀏覽器訪問 | `duk.tw/abc.jpg` | `Accept: text/html` | ✅ | ❌ | redirect → `/abc/p`（密碼表單）|
| 瀏覽器訪問 | `duk.tw/abc.jpg` | `Accept: text/html` | ✅ | ✅ | redirect → `/abc/p`（預覽頁）|
| `<img src>` | `duk.tw/abc.jpg` | `Accept: image/*` | ❌ | - | ✅ 回傳圖片 |
| `<img src>` | `duk.tw/abc.jpg` | `Accept: image/*` | ✅ | - | ❌ 403 Forbidden |

### 優缺點分析

#### 優點
- ✅ 支援 PTT/巴哈論壇嵌入（無密碼圖片）
- ✅ 保護密碼圖片（論壇無法嵌入）
- ✅ 瀏覽器訪問有完整預覽體驗
- ✅ 統一由 Smart Route API 處理，邏輯集中

#### 缺點
- ⚠️ **有密碼的圖片無法在論壇嵌入**
- ⚠️ 需要修改 Middleware 與 Smart Route API

### 替代方案：密碼圖片專用 Token

#### 邏輯
1. 密碼驗證通過後，生成臨時 token
2. 將 token 加入圖片 URL：`duk.tw/abc.jpg?t=xxx`
3. 論壇嵌入時附帶 token，Smart Route API 驗證 token 有效性

#### 實施複雜度
- 🔴 高複雜度：需要 token 生成、驗證、過期管理
- 🔴 使用者體驗差：論壇連結會變很長

### 最終建議

#### 方案 B：Middleware + Smart Route API（推薦）

**實施優先級**：
1. ✅ 修改 `middleware.ts`，帶副檔名請求 rewrite 到 Smart Route API
2. ✅ 修改 `smart-route/[hash]/route.ts`，加入密碼與請求類型判斷
3. ✅ 簡化 `[hash]/page.tsx`，只做 redirect

**權衡**：
- 無密碼圖片：✅ 完美支援論壇嵌入
- 有密碼圖片：❌ 無法在論壇嵌入（安全考量，符合預期）

**文件說明**：
> 注意：設定密碼保護的圖片無法在論壇（PTT、巴哈）中嵌入顯示。若需要論壇嵌入，請不要設定密碼。

### 測試驗證清單

#### 測試 1：無密碼 + 論壇嵌入
- URL：`https://duk.tw/abc123.jpg`
- 請求：PTT 爬蟲（`Accept: image/*`）
- 預期：✅ 回傳圖片，PTT 自動嵌入

#### 測試 2：有密碼 + 論壇嵌入
- URL：`https://duk.tw/6U4jvP.jpg`
- 請求：PTT 爬蟲（`Accept: image/*`）
- 預期：❌ 403 Forbidden，PTT 顯示連結

#### 測試 3：有密碼 + 瀏覽器訪問
- URL：`https://duk.tw/6U4jvP.jpg`
- 請求：Chrome（`Accept: text/html`）
- 預期：redirect → `/6U4jvP/p`，顯示密碼表單

#### 測試 4：有密碼 + Cookie 驗證
- URL：`https://duk.tw/6U4jvP.jpg`
- Cookie：`auth_6U4jvP=verified`
- 預期：redirect → `/6U4jvP/p`，顯示預覽頁與圖片

### 結論

**完整策略**：
1. **Middleware** rewrite 帶副檔名請求到 Smart Route API
2. **Smart Route API** 根據 `Accept` header 區分請求類型
3. **密碼保護**優先於論壇嵌入（安全第一）
4. **文件明確告知**：密碼圖片無法嵌入論壇

**立即行動**：
1. 修改 `middleware.ts:4-14`，加入 rewrite 邏輯
2. 修改 `smart-route/[hash]/route.ts:220-290`，加入密碼與請求類型判斷
3. 簡化 `[hash]/page.tsx:1-35`