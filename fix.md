# 密碼保護功能失效問題修復報告

## 🔍 問題診斷

### 核心問題
上傳圖片時設定的密碼保護功能**完全失效**，直接訪問 `https://duk.tw/{hash}` 或 `https://duk.tw/{hash}.png` 都能直接看到圖片，無需密碼驗證。

### 根本原因分析

#### 1️⃣ Upload API 未處理密碼參數 (`src/app/api/upload/route.ts:223-232`)
```typescript
await prisma.mapping.create({
  data: {
    hash,
    url: imageUrl,
    filename: safeFileName,
    shortUrl,
    createdAt: new Date(),
    // ❌ 缺少 password 和 expiresAt 欄位
  },
});
```

**問題**：儲存時完全忽略密碼和過期時間，導致資料庫中這兩個欄位永遠是 `null`。

#### 2️⃣ 前端未傳遞密碼參數 (`src/app/page.tsx:145-179`)
```typescript
const uploadFile = async (item: UploadItem): Promise<void> => {
  const formData = new FormData();
  formData.append("image", item.file, item.file.name);
  // ❌ 沒有將 password 和 expiryDate 加入 formData
  
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
}
```

**問題**：即使使用者在 UI 設定了密碼，該值也沒有被送到後端。

#### 3️⃣ Smart Route 密碼檢查失效 (`src/app/api/smart-route/[hash]/route.ts:223-236`)
```typescript
if (mapping?.password) {
  const cookies = req.cookies;
  const authCookie = cookies.get(`auth_${rawHash}`);
  
  if (!authCookie || authCookie.value !== 'verified') {
    // 理論上應該重定向到 /p 頁面要求密碼
    return NextResponse.redirect(new URL(`/${rawHash}/p`, req.url), {
      status: 302,
    });
  }
}
```

**問題**：因為 `mapping.password` 永遠是 `null`，這段檢查永遠不會執行。

## 📋 資料流向圖

### 🔴 現況（錯誤流程）
```
使用者設定密碼 → 前端 state (password) 
                      ↓
                   [未傳送]
                      ↓
                  Upload API → 儲存到 DB (password: null)
                      ↓
               Smart Route 檢查 → password 是 null → ❌ 直接顯示圖片
```

### 🟢 正確流程（應修復為）
```
使用者設定密碼 → 前端 state (password)
                      ↓
                 加入 FormData
                      ↓
                  Upload API → 從 FormData 讀取 → 儲存到 DB (password: "1234")
                      ↓
               Smart Route 檢查 → password 存在 → ✅ 重定向到預覽頁
                      ↓
                  PreviewClient → 要求使用者輸入密碼 → 驗證成功 → 設置 Cookie
                      ↓
               再次訪問 Smart Route → Cookie 驗證通過 → ✅ 顯示圖片
```

## 🛠️ 修復方案

### 修復 1: 更新 Upload API 處理密碼與過期時間
**檔案**: `src/app/api/upload/route.ts`

**修改位置**: 第 87-108 行（解析 FormData 部分）
```typescript
// 步驟 4: 解析表單資料
let formData: FormData;
try {
  formData = await request.formData();
} catch (error) {
  // ...
}

const image = formData.get("image") as File;
// ✅ 新增：讀取密碼和過期時間
const password = formData.get("password") as string | null;
const expiresAt = formData.get("expiresAt") as string | null;
```

**修改位置**: 第 223-232 行（儲存到資料庫部分）
```typescript
await prisma.mapping.create({
  data: {
    hash,
    url: imageUrl,
    filename: safeFileName,
    shortUrl,
    createdAt: new Date(),
    // ✅ 新增：儲存密碼和過期時間
    password: password || null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  },
});
```

### 修復 2: 前端傳遞密碼參數
**檔案**: `src/app/page.tsx`

**修改位置**: 第 145-179 行（uploadFile 函數）
```typescript
const uploadFile = async (item: UploadItem): Promise<void> => {
  const formData = new FormData();
  formData.append("image", item.file, item.file.name);
  
  // ✅ 新增：附加密碼和過期時間
  if (password) {
    formData.append("password", password);
  }
  if (expiryDate) {
    formData.append("expiresAt", expiryDate.toISOString());
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  // ...
}
```

### 修復 3: 確保 Smart Route 密碼檢查正常運作
此部分程式碼已經正確，只要前兩項修復完成，密碼檢查就會自動生效。

## ✅ 修復後效果

1. ✅ 使用者設定密碼後，密碼會正確儲存到資料庫
2. ✅ 訪問 `https://duk.tw/{hash}` 會被重定向到 `https://duk.tw/{hash}/p`
3. ✅ 預覽頁面會要求輸入密碼
4. ✅ 密碼正確後設置 Cookie，之後可以直接存取圖片
5. ✅ 過期時間功能同步修復

## 📊 測試步驟

### 測試案例 1: 新上傳帶密碼的圖片
1. 上傳圖片並設定密碼 `1234`
2. 檢查資料庫：`password` 欄位應為 `"1234"`
3. 訪問 `https://duk.tw/{hash}` → 應重定向到預覽頁
4. 輸入錯誤密碼 → 顯示錯誤訊息
5. 輸入正確密碼 → 顯示圖片

### 測試案例 2: 新上傳不帶密碼的圖片
1. 上傳圖片，不設定密碼
2. 檢查資料庫：`password` 欄位應為 `null`
3. 訪問 `https://duk.tw/{hash}` → 直接顯示圖片

### 測試案例 3: 舊資料相容性
1. 已存在的圖片（`password` 為 `null`）
2. 訪問應正常顯示，不要求密碼

## 🔒 安全性改進建議（後續優化）

1. **密碼加密儲存**：目前密碼是明文儲存，建議使用 bcrypt 加密
2. **密碼強度檢查**：前端增加密碼複雜度驗證
3. **嘗試次數限制**：防止暴力破解
4. **Cookie 安全性**：使用 httpOnly + secure + sameSite

## 📝 相關檔案清單

- ✅ `src/app/api/upload/route.ts` - 需修改
- ✅ `src/app/page.tsx` - 需修改  
- ℹ️ `src/app/api/smart-route/[hash]/route.ts` - 已正確，無需修改
- ℹ️ `src/app/api/verify-password/route.ts` - 已正確，無需修改
- ℹ️ `src/app/[hash]/p/PreviewClient.tsx` - 已正確，無需修改

---

**修復優先級**: 🔴 高優先級（功能完全失效）  
**預計修復時間**: 15 分鐘  
**影響範圍**: 所有新上傳的圖片密碼保護功能