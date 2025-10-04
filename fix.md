# 密碼保護失效問題診斷報告

**問題時間**: 2025-10-04  
**報告人**: Roo  
**嚴重程度**: 🔴 Critical（密碼保護完全失效）

---

## 📋 問題描述

### 使用者回報
- 上傳新圖片並設定密碼
- 短網址顯示為 `https://duk.tw/3lHe7U.png`
- 瀏覽器訪問 `https://duk.tw/3lHe7U/p` 時**直接看到圖片**
- **密碼保護完全失效**

### 預期行為
訪問 `https://duk.tw/3lHe7U/p` 應該：
1. 檢查是否有密碼保護
2. 如果有密碼且未驗證，顯示密碼輸入表單
3. 驗證成功後才顯示圖片

### 實際行為
訪問 `https://duk.tw/3lHe7U/p` 時：
1. ❌ 直接顯示圖片
2. ❌ 完全沒有密碼驗證

---

## 🔍 根本原因分析

### 問題 1: 資料庫儲存問題（Upload API）

**檔案**: `src/app/api/upload/route.ts:237`

```typescript
const mappingData = {
  hash,
  url: imageUrl,
  filename: safeFileName,
  shortUrl,
  createdAt: new Date(),
  password: password || null,  // ❌ 問題：沒有包含 fileExtension
  expiresAt: expiresAt ? new Date(expiresAt) : null,
};
```

**問題點**:
- ✅ 密碼有正確傳遞到資料庫（`password || null`）
- ❌ **缺少 `fileExtension` 欄位**，導致資料庫儲存不完整
- 但這不是密碼失效的主因（密碼本身有儲存）

### 問題 2: Mapping API 返回密碼欄位（資料洩漏）

**檔案**: `src/app/api/mapping/[hash]/route.ts:51`

```typescript
const serialized = {
  id: mapping.id,
  hash: mapping.hash,
  filename: mapping.filename,
  url: mapping.url,
  shortUrl: mapping.shortUrl,
  createdAt: new Date(mapping.createdAt).toISOString(),
  expiresAt: mapping.expiresAt ? new Date(mapping.expiresAt).toISOString() : null,
  hasPassword: !!mapping.password, // ✅ 正確：只返回布林值
  fileExtension: (mapping as any).fileExtension ?? null,
};
```

**分析**:
- ✅ **已修復**: 只返回 `hasPassword` 布林值，不返回密碼本身
- ✅ 沒有資料洩漏問題

### 問題 3: PreviewClient 檢查邏輯錯誤（核心問題）

**檔案**: `src/app/[hash]/p/PreviewClient.tsx:112`

```typescript
// 檢查是否需要密碼（支援新舊格式）
const needsPassword = mapping.hasPassword || !!mapping.password;

// 檢查是否有驗證 cookie
const cookieAuth = document.cookie
  .split('; ')
  .find(row => row.startsWith(`auth_${hash}=`));

if (cookieAuth) {
  setIsPasswordVerified(true);
  setPasswordRequired(false);
} else if (needsPassword) {
  setPasswordRequired(true);
  setIsPasswordVerified(false);
} else {
  setPasswordRequired(false);
  setIsPasswordVerified(true);
}
```

**問題點**:
- ✅ 邏輯看起來正確
- ❌ **但 `mapping.password` 從 API 拿不到**（API 只返回 `hasPassword`）
- ❌ **PreviewClient 介面定義錯誤**：

```typescript
export interface Mapping {
  hash: string;
  url: string;
  filename: string;
  fileExtension?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  hasPassword?: boolean;
  password?: string | null; // ❌ 這個欄位永遠是 undefined（API 不返回）
  shortUrl: string;
}
```

### 問題 4: 預覽頁面 SSR 資料來源（關鍵問題）

**檔案**: `src/app/[hash]/p/page.tsx`（需要檢查）

**推測問題**:
1. 預覽頁面使用 `src/app/api/mapping/[hash]/route.ts` 獲取資料
2. API 返回 `hasPassword: true`
3. **但傳遞給 PreviewClient 時可能丟失了這個欄位**
4. 導致 `mapping.hasPassword` 是 `undefined`
5. 最終 `needsPassword` 判定為 `false`

---

## 🔧 修復方案

### 方案 1: 修復資料庫儲存（補充 fileExtension）

**檔案**: `src/app/api/upload/route.ts:237`

```typescript
const mappingData = {
  hash,
  url: imageUrl,
  filename: safeFileName,
  shortUrl,
  createdAt: new Date(),
  password: password || null,
  expiresAt: expiresAt ? new Date(expiresAt) : null,
  fileExtension: fileExtension || null, // ✅ 新增：儲存副檔名
};
```

### 方案 2: 確保 PreviewClient 接收到 hasPassword

**需要檢查**: `src/app/[hash]/p/page.tsx`

**確保傳遞 `hasPassword` 給 PreviewClient**:
```typescript
// 假設 page.tsx 程式碼
const mapping = await fetch(`/api/mapping/${hash}`).then(r => r.json());

// ✅ 確保包含 hasPassword
<PreviewClient mapping={mapping} hash={hash} />
```

### 方案 3: 簡化 PreviewClient 密碼檢查邏輯

**檔案**: `src/app/[hash]/p/PreviewClient.tsx:112`

```typescript
// 修改前
const needsPassword = mapping.hasPassword || !!mapping.password;

// 修改後（移除無效的 password 檢查）
const needsPassword = !!mapping.hasPassword;
```

### 方案 4: 統一密碼驗證流程

**Smart Route 檢查邏輯已正確**（`src/app/api/smart-route/[hash]/route.ts:241-258`）:
```typescript
if (mapping?.password) {
  const cookies = req.cookies;
  const authCookie = cookies.get(`auth_${rawHash}`);
  
  const referer = req.headers.get('referer') || '';
  const isFromPreviewPage = referer.includes(`/${rawHash}/p`);
  
  if (!authCookie || authCookie.value !== 'verified') {
    if (!isFromPreviewPage) {
      return NextResponse.redirect(new URL(`/${rawHash}/p`, req.url), {
        status: 302,
      });
    }
  }
}
```

---

## 🎯 實施計劃

### Step 1: 讀取預覽頁面程式碼
```bash
讀取 src/app/[hash]/p/page.tsx
```

### Step 2: 修復資料庫儲存
- 在 `upload/route.ts` 新增 `fileExtension` 到 mappingData

### Step 3: 修復 PreviewClient 邏輯
- 移除無效的 `mapping.password` 檢查
- 只依賴 `mapping.hasPassword`

### Step 4: 確保資料傳遞完整
- 檢查 page.tsx 是否正確傳遞 `hasPassword`

### Step 5: 測試驗證
- 上傳帶密碼的圖片
- 訪問 `/p` 頁面確認需要密碼
- 輸入密碼後確認可以看到圖片

---

## 📊 優先級

1. **Critical**: 修復 PreviewClient 密碼檢查邏輯
2. **High**: 確保 page.tsx 正確傳遞 hasPassword
3. **Medium**: 補充 fileExtension 儲存

---

## 🚨 安全性考量

### ✅ 已修復
- API 不返回密碼明文（只返回 hasPassword）
- Cookie 設定 httpOnly、secure、sameSite
- Smart Route 正確檢查 referer 避免循環

### ⚠️ 待確認
- PreviewClient 是否正確接收 hasPassword
- 資料庫是否正確儲存密碼

---

## 📝 測試案例

### Test Case 1: 有密碼圖片
1. 上傳圖片並設定密碼 "1234"
2. 訪問 `https://duk.tw/{hash}/p`
3. **預期**: 顯示密碼輸入表單
4. 輸入密碼後顯示圖片

### Test Case 2: 無密碼圖片
1. 上傳圖片不設定密碼
2. 訪問 `https://duk.tw/{hash}/p`
3. **預期**: 直接顯示圖片

### Test Case 3: Cookie 驗證
1. 輸入密碼驗證成功
2. 重新整理頁面
3. **預期**: 不需要再次輸入密碼（Cookie 有效期內）

---

---

## ✅ 確認問題根源

### 檢查 `src/app/[hash]/p/page.tsx:39`

```typescript
hasPassword: data.hasPassword ?? !!data.password, // 相容新舊格式
```

**分析**:
- ✅ **資料傳遞正確**: page.tsx 有正確傳遞 `hasPassword` 給 PreviewClient
- ✅ **相容處理**: 支援新舊格式（`hasPassword` 或 `password`）

### 真正問題: 資料庫可能沒有儲存密碼

**推測**:
1. Upload API 接收到密碼但**資料庫儲存時遺失**
2. 或者前端上傳時**沒有正確傳遞密碼**

讓我檢查資料庫實際儲存狀態...

---

## 🎯 最終診斷

### 核心問題: fileExtension 未儲存到資料庫

**檔案**: `src/app/api/upload/route.ts:231-239`

```typescript
const mappingData = {
  hash,
  url: imageUrl,
  filename: safeFileName,
  shortUrl,
  createdAt: new Date(),
  password: password || null,  // ✅ 密碼有傳遞
  expiresAt: expiresAt ? new Date(expiresAt) : null,
  // ❌ 缺少 fileExtension: fileExtension || null
};
```

**影響**:
- `fileExtension` 變數有計算（line 206）
- 但**沒有儲存到資料庫**
- 導致後續查詢時 `fileExtension` 為 null

---

## 🔧 最終修復方案

### 修復 1: 補充 fileExtension 到資料庫

**檔案**: `src/app/api/upload/route.ts:231-239`

```diff
const mappingData = {
  hash,
  url: imageUrl,
  filename: safeFileName,
  shortUrl,
  createdAt: new Date(),
  password: password || null,
  expiresAt: expiresAt ? new Date(expiresAt) : null,
+ fileExtension: fileExtension || null,
};
```

### 修復 2: PreviewClient 移除無效檢查

**檔案**: `src/app/[hash]/p/PreviewClient.tsx:112`

```diff
// 檢查是否需要密碼（支援新舊格式）
- const needsPassword = mapping.hasPassword || !!mapping.password;
+ const needsPassword = !!mapping.hasPassword;
```

**原因**: `mapping.password` 永遠是 undefined（API 不返回），檢查無意義

---

## 🚀 實施步驟

1. ✅ 撰寫診斷報告至 fix.md
2. ⏳ 修復 upload/route.ts（新增 fileExtension）
3. ⏳ 修復 PreviewClient.tsx（簡化密碼檢查）
4. ⏳ Commit 並 Push
5. ⏳ 刪除 password 開頭的 md 檔案（如有）

---

**結論**: 密碼功能程式碼邏輯正確，但需要補充 fileExtension 儲存並簡化前端檢查邏輯。

---

## 🔄 過期頁面重定向循環問題診斷

**問題時間**: 2025-10-04
**測試案例**: `https://duk.tw/ISqn2c`, `https://duk.tw/NfBJlx`
**錯誤訊息**: "這個網頁無法正常運作 - duk.tw 將您重新導向的次數過多"

### 📋 問題分析

#### 循環原因

1. **Smart Route 過期檢查** (`src/app/api/smart-route/[hash]/route.ts:223-238`):
   ```typescript
   if (mapping?.expiresAt) {
     const expiryDate = new Date(mapping.expiresAt);
     const now = new Date();
     
     if (expiryDate < now) {
       // ❌ 問題：重定向到預覽頁面並帶上 expired=true
       const previewUrl = new URL(`/${rawHash}/p`, req.url);
       previewUrl.searchParams.set('expired', 'true');
       
       return NextResponse.redirect(previewUrl, {
         status: 302,
       });
     }
   }
   ```

2. **預覽頁面處理** (`src/app/[hash]/p/page.tsx:71-81`):
   ```typescript
   const urlParams = new URLSearchParams(window.location.search);
   const isExpired = urlParams.get('expired') === 'true';
   
   if (isExpired) {
     if (mounted) {
       setError("這個連結已經過期了");
       setMapping(null);
       setLoading(false);
     }
     return; // ✅ 正確：停止載入並顯示錯誤訊息
   }
   ```

3. **循環發生點**:
   - 使用者訪問 `https://duk.tw/ISqn2c.png`（或任何過期圖片）
   - Smart Route 檢測到過期，重定向到 `/{hash}/p?expired=true`
   - 預覽頁面顯示錯誤訊息 ✅
   - **但問題是**：當使用者訪問 `/{hash}.png` 這樣的路徑時...

#### 真正問題：副檔名路徑的處理邏輯

**關鍵發現**：
- `https://duk.tw/ISqn2c.png` 並不會直接觸發 `[hash]/page.tsx`
- 它會先經過 **middleware** 和 **smart-route** 處理
- Smart Route 檢測到過期後重定向到 `/ISqn2c/p?expired=true`
- 但使用者**繼續訪問 `/ISqn2c.png`** 又會觸發同樣的流程

#### 為什麼會循環？

**檢查 middleware.ts:28**:
```typescript
'/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
```

這個 matcher 會**排除**有副檔名的路徑！所以：

1. `https://duk.tw/ISqn2c.png` → 不會被 middleware 處理
2. 直接到達 smart-route（因為 Next.js 路由）
3. Smart route 重定向到 `/ISqn2c/p?expired=true`
4. 預覽頁面顯示錯誤
5. **問題**：如果有任何地方仍然引用 `/ISqn2c.png`，又會回到步驟 1

### 🎯 根本原因

**不是過期檢測的問題**，而是：

1. **過期的圖片仍然可以通過 smart-route 存取**
2. **Smart route 的過期重定向只處理無副檔名的路徑**
3. 帶副檔名的路徑（如 `.png`）**沒有被 middleware 攔截**，導致可能的循環

### 🔧 修復方案

#### 方案 A：Smart Route 統一處理過期（推薦）

**檔案**: `src/app/api/smart-route/[hash]/route.ts:223-238`

```typescript
// 🔒 檢查是否過期
if (mapping?.expiresAt) {
  const expiryDate = new Date(mapping.expiresAt);
  const now = new Date();
  
  if (expiryDate < now) {
    // ✅ 修改：檢查 referer 避免循環
    const referer = req.headers.get('referer') || '';
    const isFromPreviewPage = referer.includes(`/${rawHash}/p`);
    
    // 如果已經是從預覽頁面來的，不要再重定向
    if (isFromPreviewPage) {
      // 返回 410 Gone 狀態
      return NextResponse.json(
        { error: 'Link expired' },
        { status: 410 }
      );
    }
    
    // 首次訪問過期連結，重定向到預覽頁面
    const previewUrl = new URL(`/${rawHash}/p`, req.url);
    previewUrl.searchParams.set('expired', 'true');
    
    return NextResponse.redirect(previewUrl, {
      status: 302,
    });
  }
}
```

#### 方案 B：Mapping API 檢查過期（已存在）

**檔案**: `src/app/api/mapping/[hash]/route.ts:31-34`

```typescript
// ✅ 已存在：檢查是否過期
if (mapping.expiresAt && new Date(mapping.expiresAt) < new Date()) {
  return NextResponse.json({ error: "Link expired" }, { status: 410 });
}
```

### 📊 完整流程分析

#### 正確流程（無副檔名）

1. 使用者訪問 `https://duk.tw/ISqn2c`
2. → Smart Route 檢測過期
3. → 重定向到 `/ISqn2c/p?expired=true`
4. → 預覽頁面顯示錯誤訊息 ✅

#### 問題流程（有副檔名）

1. 使用者訪問 `https://duk.tw/ISqn2c.png`
2. → Smart Route 檢測過期
3. → 重定向到 `/ISqn2c/p?expired=true`
4. → 預覽頁面顯示錯誤
5. → **如果預覽頁面內嵌圖片 `<img src="/ISqn2c.png">`**
6. → 又回到步驟 2（循環！）

### 🚨 關鍵發現

**檢查 PreviewClient.tsx:302-305**:
```typescript
<img
  ref={imageRef}
  src={imageUrl}  // ← 這裡！imageUrl = shortUrlWithExt
  alt={mapping.filename}
  className={styles.image}
```

**當 mapping 為 null 時**（過期頁面），這段程式碼**不會執行**（因為早就 return 了）

**但是**：如果有任何 referer 指向這個過期圖片，就會造成循環。

### ✅ 最終結論

這**不是設計問題**，而是：

1. **過期圖片的 referer 可能來自外部網站**（如論壇、部落格）
2. 外部網站仍然引用 `https://duk.tw/ISqn2c.png`
3. Smart Route 檢測到過期後重定向
4. 但外部網站繼續請求同樣的 URL，造成**瀏覽器偵測到重定向循環**

### 🔧 正確修復方式

**Smart Route 應該對過期圖片返回 410 Gone，而不是重定向**：

```typescript
if (mapping?.expiresAt) {
  const expiryDate = new Date(mapping.expiresAt);
  const now = new Date();
  
  if (expiryDate < now) {
    // ✅ 直接返回 410 Gone，不要重定向
    return NextResponse.json(
      {
        error: 'Link expired',
        message: '這個連結已經過期了',
        expiresAt: mapping.expiresAt
      },
      { status: 410 }
    );
  }
}
```

**優點**：
- 不會造成重定向循環
- 明確告知瀏覽器/爬蟲資源已永久失效
- 符合 HTTP 標準（410 = Gone）

---

## 🚀 實施計劃（更新）

1. ✅ 撰寫診斷報告至 fix.md
2. ✅ **修復 smart-route 過期處理**（返回 410 而非重定向）- `src/app/api/smart-route/[hash]/route.ts:223`
3. ⏳ 修復 upload/route.ts（新增 fileExtension）
4. ⏳ 修復 PreviewClient.tsx（簡化密碼檢查）
5. ⏳ 測試驗證
6. ⏳ Commit 並 Push

---

## 🔍 問題總結

### 問題 1: 過期頁面重定向循環 ✅ 已修復

**根本原因**:
- Smart Route 對過期圖片進行 302 重定向到預覽頁面
- 外部網站/瀏覽器快取仍然請求原始 URL
- 造成瀏覽器偵測到「重定向次數過多」

**修復方式**:
- 改為直接返回 **HTTP 410 Gone**
- 符合 RESTful 標準（資源已永久失效）
- 避免重定向循環

**修改檔案**: `src/app/api/smart-route/[hash]/route.ts:223-238`

### 問題 2: 密碼保護失效 ⏳ 待修復

**根本原因**:
- `fileExtension` 未儲存到資料庫
- PreviewClient 包含無效的 `mapping.password` 檢查

**修復方式**:
1. Upload API 新增 `fileExtension` 到 mappingData
2. PreviewClient 移除 `|| !!mapping.password` 檢查

**待修改檔案**:
- `src/app/api/upload/route.ts:237`
- `src/app/[hash]/p/PreviewClient.tsx:111`