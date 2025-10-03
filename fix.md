# 預覽頁「圖片破圖後才跳出」問題分析報告

## 📋 問題描述

- **案例 URL**：`https://duk.tw/giX5WR/p`（預覽頁）
- **現象**：頁面載入時，會先出現破圖狀態持續數秒，之後才顯示正常圖片
- **對比**：直接訪問 `https://duk.tw/giX5WR` 可以馬上看到圖片（無破圖階段）

---

## 🔍 根本原因分析

### 1. **預覽頁的雙重載入流程**

**現況架構**：
```
使用者訪問 /giX5WR/p
  ↓
page.tsx 用 useEffect fetch API (/api/mapping/giX5WR)
  ↓ (非同步等待，顯示「載入中...」)
取得 mapping 資料後 render PreviewClient
  ↓
PreviewClient 內又用 useEffect 預載圖片 (L108-143)
  ↓ (再次非同步等待)
圖片載入完成後才設定 setImageSrc
  ↓
<img> 才真正顯示
```

**時間軸**：
1. `0ms`：頁面開始載入，顯示「載入中...」
2. `200-500ms`：API 回傳 mapping 資料
3. `500-800ms`：PreviewClient mounted，開始預載圖片
4. `1000-3000ms`：圖片預載完成（依網速與圖片大小）
5. **問題點**：在步驟 3-4 之間，`imageSrc` 為 `null`，顯示灰色占位框「圖片載入中…」（L307-330）

### 2. **為何直接訪問 `/giX5WR` 不會破圖？**

**直接訪問流程**：
```
使用者訪問 /giX5WR
  ↓
middleware.ts 或 smart-route 直接返回圖片 binary（proxy mode）
  ↓
瀏覽器原生圖片載入機制（漸進式顯示）
```

**差異**：
- 沒有 React 的多層 useEffect 等待
- 沒有「先取 mapping → 再載圖」的雙重往返
- 直接由 CDN/後端串流圖片，瀏覽器自動處理漸進式渲染

### 3. **PreviewClient 預載機制的副作用**

**目前邏輯**（L108-143）：
```typescript
useEffect(() => {
  // 先嘗試 shortUrlWithExt（帶副檔名）
  const okExt = await tryPreload(shortUrlWithExt, false);
  if (okExt) {
    setImageSrc(shortUrlWithExt);  // ← 此時才設值
    return;
  }
  // 失敗再試 shortUrlNoExt
  const okNoExt = await tryPreload(shortUrlNoExt, true);
  if (okNoExt) {
    setImageSrc(shortUrlNoExt);
  } else {
    setImageSrc(shortUrlWithExt); // 交給 onError 處理
  }
}, [shortUrlWithExt, shortUrlNoExt]);
```

**問題**：
- 在預載完成前，`imageSrc` 保持 `null`
- 顯示灰色占位框（非真實圖片）
- 即使圖片已在瀏覽器快取，仍需等待預載邏輯執行

---

## 💡 可能的解決方案

### 方案 A：**立即設定 `imageSrc`，改用 `loading` state 控制占位**

**思路**：
- 不等預載，直接設 `imageSrc = shortUrlWithExt`
- 用 `onLoad` 事件隱藏占位圖、顯示真實圖片
- 保留 `onError` 回退機制

**優點**：
- 圖片立即開始載入（瀏覽器原生行為）
- 可利用瀏覽器快取（304 Not Modified）
- 減少一層 JS 非同步等待

**缺點**：
- 若帶副檔名版本 404，會先出現短暫錯誤狀態（可用 loading overlay 遮蓋）

---

### 方案 B：**SSR 預渲染圖片**

**思路**：
- 在 `page.tsx` Server Component 階段就取得 mapping
- 直接在 HTML 內渲染 `<img src="...">`（搭配 `loading="eager"`）
- 移除客戶端預載邏輯

**優點**：
- 首屏即有圖片 URL，瀏覽器立即開始下載
- 無 JS 等待時間
- SEO 友善（圖片在 HTML 內）

**缺點**：
- 需改寫為 Server Component（目前是 `"use client"`）
- 可能與密碼保護邏輯衝突（需客戶端互動）

---

### 方案 C：**混合模式（推薦）**

**思路**：
1. **立即設定 `imageSrc`**（方案 A）
2. **同時執行預載檢查**（背景驗證）
3. **若預載失敗，在 `onError` 內切換 URL**

**實作重點**：
```typescript
useEffect(() => {
  // 1. 立即設定（不等待）
  setImageSrc(shortUrlWithExt);
  
  // 2. 背景預載檢查（僅用於決定是否需要回退）
  tryPreload(shortUrlWithExt, false).then(ok => {
    if (!ok) {
      // 預先切換到 noExt 版本，避免真實渲染時才 404
      setImageSrc(shortUrlNoExt);
    }
  });
}, [shortUrlWithExt, shortUrlNoExt]);
```

**優點**：
- 兼顧速度（立即顯示）與穩定性（自動回退）
- 不破壞現有邏輯架構

---

### 方案 D：**Server-Side 圖片可用性檢查**

**思路**：
- 在 API `/api/mapping/[hash]` 內，額外回傳 `imageAvailable: boolean`
- 由後端先 HEAD 請求驗證圖片 URL
- 前端根據此值直接決定用哪個 URL

**優點**：
- 前端零等待（後端已驗證）
- 可快取驗證結果（減少重複檢查）

**缺點**：
- API 回應變慢（需等待 HEAD 請求）
- 增加後端負擔

---

## 🎯 建議優先級

1. **方案 C（混合模式）** ← 最佳平衡
   - 立即改善使用者體驗
   - 保留現有容錯機制
   - 修改成本低

2. **方案 A（立即設定）**
   - 最簡單的快速修復
   - 可作為 MVP 測試

3. **方案 B（SSR）**
   - 長期優化方向
   - 需重構較多程式碼

4. **方案 D（後端檢查）**
   - 適合有穩定 CDN 的場景
   - 目前成本效益較低

---

## 📝 補充說明

### 為何行動端更明顯？
- 網路延遲較高（4G/5G 波動）
- CPU 效能較弱（JS 執行慢）
- 雙重 useEffect 的累積延遲被放大

### 當前占位圖邏輯（L307-330）
```typescript
{imageSrc ? (
  <img src={imageSrc} ... />
) : (
  <div>圖片載入中…</div>  // ← 破圖的根源
)}
```

**改善後目標**：
- 永遠顯示 `<img>`（即使 URL 未驗證）
- 用 CSS `opacity` 或 skeleton 遮蓋載入狀態
- 移除「等待 imageSrc 設值」的邏輯

---

## ✅ 下一步行動

請確認要實作哪個方案，我將立即修改對應程式碼。建議從**方案 C**開始測試。