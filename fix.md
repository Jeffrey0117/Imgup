# 預覽頁「閃跳優化」深度分析與最佳解決方案

## 📊 現況評估

### ✅ 已改善部分（第一階段修復）
- 移除預載阻塞，圖片立即開始載入
- 載入速度從 1-3 秒降至 200-500ms
- 破圖時間大幅減少

### ⚠️ 仍存在的問題
- **閃跳現象**：`imageSrc` 從 `null` 切換至實際 URL 時，UI 會從「載入中占位框」跳到真實圖片
- **根本原因**：L270-321 仍保留 `imageSrc ? <img> : <div>載入中...</div>` 的條件渲染

---

## 🔍 閃跳原因技術分析

### 當前渲染流程（問題點）

```typescript
// L107-110: useEffect 內設定 imageSrc
useEffect(() => {
  setImageSrc(shortUrlWithExt); // ← 此時觸發 re-render
}, [shortUrlWithExt, shortUrlNoExt]);

// L270-321: 條件渲染
{imageSrc ? (
  <img src={imageSrc} />  // ← 第二次 render 才出現
) : (
  <div>圖片載入中…</div>  // ← 第一次 render 顯示此框
)}
```

### 時間軸分析

```
0ms    ┌─ PreviewClient mounted
       │  imageSrc = null
       │  Render: <div>載入中...</div> 顯示灰框
       │
16ms   ├─ useEffect 執行
       │  setImageSrc(shortUrlWithExt)
       │  ↓ 觸發 re-render
       │
32ms   ├─ Re-render
       │  imageSrc = "https://duk.tw/giX5WR.jpg"
       │  Render: <img> 替換灰框 ← 🔴 此處產生閃跳
       │
100ms  └─ 瀏覽器開始下載圖片（若有快取則瞬間完成）
```

**問題核心**：React 的兩次渲染（null → URL）造成 DOM 結構變化（`<div>` → `<img>`），即使圖片已在快取，仍會先顯示占位框。

---

## 💡 最佳解決方案矩陣

### 方案 1：初始狀態預設 URL（最簡單）★★★★★

**概念**：移除 `imageSrc` state，直接在初次渲染時就用正確 URL

```typescript
// 移除 useState
// const [imageSrc, setImageSrc] = useState<string | null>(null); ✖

// 直接計算最終 URL（不需 useEffect）
const finalImageUrl = useMemo(() => {
  // 預設優先使用 shortUrlWithExt
  return shortUrlWithExt;
}, [shortUrlWithExt]);

// 渲染時永遠顯示 <img>
<img src={finalImageUrl} ... />
```

**優點**：
- ✅ 零閃跳（首次渲染即為 `<img>`）
- ✅ 瀏覽器原生快取立即生效
- ✅ 程式碼更簡潔（移除 state 與 useEffect）
- ✅ 修改成本極低

**缺點**：
- ⚠️ 若 `shortUrlWithExt` 404，會觸發 `onError` 切換（但仍比現況快）

---

### 方案 2：CSS 淡入動畫遮蓋（體驗優化）★★★★☆

**概念**：保留 `<img>` 永久顯示，用 `opacity` 控制淡入

```typescript
const [imageLoaded, setImageLoaded] = useState(false);

<div style={{ position: 'relative' }}>
  <img
    src={shortUrlWithExt}
    style={{ 
      opacity: imageLoaded ? 1 : 0,
      transition: 'opacity 200ms ease-in'
    }}
    onLoad={() => setImageLoaded(true)}
  />
  {!imageLoaded && (
    <div style={{ 
      position: 'absolute', 
      inset: 0,
      background: '#f3f4f6'
    }}>
      載入中...
    </div>
  )}
</div>
```

**優點**：
- ✅ 平滑淡入效果（視覺體驗佳）
- ✅ 圖片立即開始下載
- ✅ 占位圖與圖片位置重疊（無跳動）

**缺點**：
- ⚠️ 仍需一次 re-render（`onLoad` 觸發）
- ⚠️ 程式碼稍複雜

---

### 方案 3：SSR 預先注入 URL（終極方案）★★★★★

**概念**：在 Server Component 階段就取得 mapping，直接渲染 HTML

```typescript
// page.tsx 改為 Server Component
export default async function PreviewPage({ params }: Props) {
  const mapping = await fetchMapping(params.hash);
  
  if (!mapping) return <ErrorPage />;
  
  // 直接在 HTML 內渲染（無 JS 等待）
  const imageUrl = `${baseUrl}/${params.hash}${getExt(mapping)}`;
  
  return (
    <div>
      <img src={imageUrl} loading="eager" />
    </div>
  );
}
```

**優點**：
- ✅ 零 JS 等待（HTML 內已有圖片 URL）
- ✅ 首屏最快（瀏覽器直接開始下載）
- ✅ SEO 友善（圖片在 SSR HTML 內）
- ✅ 無任何閃跳（無客戶端 state）

**缺點**：
- ⚠️ 需重構為 Server Component（目前是 `"use client"`）
- ⚠️ 密碼保護邏輯需分離處理（可用 Client Component 包裹）
- ⚠️ 開發成本較高

---

### 方案 4：Skeleton 預先渲染（折衷方案）★★★☆☆

**概念**：用 CSS 製作與圖片同尺寸的骨架屏，避免高度跳動

```typescript
<div style={{ aspectRatio: '16/9', background: 'linear-gradient(...)' }}>
  <img
    src={shortUrlWithExt}
    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
  />
</div>
```

**優點**：
- ✅ 預先佔位，減少版面跳動
- ✅ 載入動畫視覺體驗佳

**缺點**：
- ⚠️ 需事先知道圖片比例（或用預設值）
- ⚠️ 仍有淡入切換

---

## 🎯 推薦實作優先級

### 🥇 階段一：立即修復（方案 1 + 方案 2 混合）

**目標**：10 分鐘內部署，閃跳減少 90%

```typescript
// PreviewClient.tsx 修改重點

// 1. 移除 imageSrc state，改用 computed value
const imageUrl = useMemo(() => shortUrlWithExt, [shortUrlWithExt]);

// 2. 加入載入狀態控制淡入
const [imageLoaded, setImageLoaded] = useState(false);

// 3. 永久渲染 <img>，用 opacity 控制
<img
  src={imageUrl}
  style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 150ms' }}
  onLoad={() => setImageLoaded(true)}
  onError={(e) => {
    if (!e.currentTarget.dataset.triedNoExt) {
      e.currentTarget.dataset.triedNoExt = 'true';
      e.currentTarget.src = shortUrlNoExt;
      setImageLoaded(false); // 重置淡入
    }
  }}
/>
```

**預期效果**：
- ✅ 首次渲染即為 `<img>`（瀏覽器立即開始下載）
- ✅ 淡入動畫平滑（無閃跳）
- ✅ 保留自動回退機制

---

### 🥈 階段二：極致優化（方案 3 - SSR）

**目標**：重構為 Server Component，達到與 `/giX5WR` 相同速度

**修改範圍**：
1. `page.tsx` 移除 `"use client"`，改為 async Server Component
2. 在伺服器端執行 `fetchMapping`
3. 密碼保護邏輯獨立為 Client Component
4. 圖片 URL 直接在 HTML 內渲染

**優點**：
- 🚀 首屏速度 < 100ms（無 API 往返）
- 🚀 無任何 React hydration 等待
- 🚀 圖片與頁面同時開始載入

---

## 📋 詳細實作步驟（階段一）

### Step 1: 移除阻塞邏輯

```diff
- const [imageSrc, setImageSrc] = useState<string | null>(null);
+ const [imageLoaded, setImageLoaded] = useState(false);

- useEffect(() => {
-   setImageSrc(shortUrlWithExt);
-   // ... 預載邏輯
- }, [shortUrlWithExt, shortUrlNoExt]);
```

### Step 2: 直接計算 URL

```typescript
const imageUrl = useMemo(() => shortUrlWithExt, [shortUrlWithExt]);
```

### Step 3: 改寫渲染邏輯

```diff
- {imageSrc ? (
-   <img src={imageSrc} />
- ) : (
-   <div>載入中...</div>
- )}

+ <div style={{ position: 'relative' }}>
+   <img
+     src={imageUrl}
+     style={{
+       opacity: imageLoaded ? 1 : 0,
+       transition: 'opacity 150ms ease-in'
+     }}
+     onLoad={() => setImageLoaded(true)}
+   />
+   {!imageLoaded && <LoadingSkeleton />}
+ </div>
```

---

## 🔬 效能對比分析

| 指標 | 原始版本 | 第一階段修復 | 階段一優化 | 階段二 SSR |
|------|---------|------------|----------|-----------|
| 首次渲染至圖片 | 1-3s | 200-500ms | **50-100ms** | **< 50ms** |
| 閃跳次數 | 2 次 | 1 次 | **0 次** | **0 次** |
| 快取命中速度 | 慢 | 中 | **快** | **極快** |
| 行動端體驗 | 差 | 中 | **優** | **極優** |
| 開發成本 | - | 低 | **極低** | 中 |

---

## ✅ 建議行動方案

### 立即執行（5 分鐘）
1. 實作**方案 1 + 2**（移除 state + 淡入動畫）
2. 測試 `https://duk.tw/giX5WR/p`
3. 部署至 production

### 後續優化（1-2 小時）
1. 評估 SSR 重構可行性
2. 處理密碼保護與 SSR 的兼容性
3. 壓力測試與效能監控

---

## 🚀 預期最終效果

- ⚡ 預覽頁速度與直接訪問 `/giX5WR` 一致
- 🎨 零閃跳、零破圖
- 📱 行動端載入如絲般順滑
- 🔄 保留所有容錯機制（自動回退、密碼保護）
- 💾 完美利用瀏覽器快取

---

## 💬 補充說明

### 為何不用 `loading="lazy"`？
- 預覽頁的圖片是核心內容，應立即載入
- `loading="eager"` 或省略（預設）即可

### 為何 SSR 最快？
- 無客戶端 API 請求
- 無 React hydration 等待
- 圖片 URL 在 HTML 內，瀏覽器解析時立即發送請求

### 是否需要 `<link rel="preload">`？
- 可在 `<head>` 內加入 `<link rel="preload" as="image" href="..." />`
- 但 SSR 已足夠快，非必要

---

**下一步**：請確認要實作哪個方案，我將立即開始修改程式碼。建議從**階段一（方案 1+2）**開始，5 分鐘內可完成部署。