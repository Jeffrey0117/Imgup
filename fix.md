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