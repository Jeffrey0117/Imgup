# 錯誤處理與到期圖片修復方案(MVP)

## 🚨 問題總覽

### 問題 1: 錯誤頁面排版破損
**症狀**: 訪問 `https://duk.tw/pqi0h123123/p` 顯示「哎呀找不到資源」,排版破掉
**位置**: [`src/app/[hash]/p/page.tsx:104-122`](src/app/[hash]/p/page.tsx:104)

**當前狀況**:
```tsx
// 錯誤頁面只有基本結構,沒有統一樣式
<div className={styles.container}>
  <div className={styles.error}>
    <h2>
      <img src="/logo-imgup.png" ... />
      哎呀！
    </h2>
  </div>
  <p className={styles.errorText}>{error || "無法顯示此頁面"}</p>
  <a href="/" className={styles.backLink}>回到首頁</a>
</div>
```

**問題分析**:
- ❌ 缺少視覺層次(icon + 標題 + 說明 + 按鈕)
- ❌ 排版不一致(與其他錯誤頁面風格不同)
- ❌ 缺少友善提示(使用者不知道發生什麼事)

---

### 問題 2: 到期圖片重定向循環
**症狀**: 訪問到期圖片出現「duk.tw 將您重新導向的次數過多」
**根本原因**: 到期圖片被重定向,但沒有專屬頁面處理

**當前邏輯流程**:
```
1. 使用者訪問到期圖片 /{hash}
2. Smart Route 檢測到 expiresAt < now
3. 重定向到 /{hash}/p (預覽頁)
4. 預覽頁發現已過期,設定 error="連結已過期"
5. 但仍然嘗試載入 → 觸發某種循環
```

**問題分析**:
- ❌ 沒有獨立的「已過期」頁面
- ❌ 到期檢測邏輯分散在多處
- ❌ 錯誤處理不一致

---

## 🎯 MVP 修復方案

### 設計原則
1. **統一錯誤頁面樣式**(404/過期/無權限共用同一組件)
2. **提前檢測到期狀態**(在 API 層直接返回專屬錯誤)
3. **避免重定向循環**(使用錯誤頁面替代重定向)
4. **最小改動範圍**(只修改必要檔案)

---

## 📋 實施計劃

### 階段 1: 統一錯誤頁面組件

#### 1.1 修改 [`src/app/[hash]/p/page.tsx:104-122`](src/app/[hash]/p/page.tsx:104)

**修改前**:
```tsx
if (!mapping) {
  return (
    <div className={styles.container}>
      <div className={styles.error}>
        <h2>
          <img src="/logo-imgup.png" alt="duk.tw Logo" style={{...}} />
          哎呀！
        </h2>
      </div>
      <p className={styles.errorText}>{error || "無法顯示此頁面"}</p>
      <a href="/" className={styles.backLink}>回到首頁</a>
    </div>
  );
}
```

**修改後**(統一錯誤頁面結構):
```tsx
if (!mapping) {
  return (
    <div className={styles.container}>
      <div className={styles.errorPage}>
        <div className={styles.errorIcon}>
          <img 
            src="/logo-imgup.png" 
            alt="duk.tw Logo" 
            className={styles.errorLogo}
          />
        </div>
        <h2 className={styles.errorTitle}>哎呀！</h2>
        <p className={styles.errorMessage}>
          {error || "找不到這個連結"}
        </p>
        <div className={styles.errorHint}>
          <p>可能的原因：</p>
          <ul>
            <li>連結輸入錯誤</li>
            <li>圖片已被刪除</li>
            <li>連結已過期</li>
          </ul>
        </div>
        <a href="/" className={styles.backLink}>
          回到首頁
        </a>
      </div>
    </div>
  );
}
```

#### 1.2 新增 CSS 樣式至 [`src/app/[hash]/page.module.css`](src/app/[hash]/page.module.css:1)

```css
/* 統一錯誤頁面樣式 */
.errorPage {
  max-width: 500px;
  width: 100%;
  background: #1f2126;
  border-radius: 16px;
  padding: 48px 32px;
  box-shadow: 0 10px 40px #0008;
  text-align: center;
}

.errorIcon {
  margin-bottom: 24px;
}

.errorLogo {
  width: 80px;
  height: 80px;
  opacity: 0.8;
  filter: grayscale(50%);
}

.errorTitle {
  font-size: 2rem;
  font-weight: 700;
  color: #ffa940;
  margin-bottom: 16px;
}

.errorMessage {
  font-size: 1.1rem;
  color: #ccc;
  margin-bottom: 24px;
  line-height: 1.6;
}

.errorHint {
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.errorHint p {
  font-size: 0.9rem;
  color: #999;
  margin-bottom: 8px;
  font-weight: 600;
}

.errorHint ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.errorHint li {
  font-size: 0.85rem;
  color: #aaa;
  padding: 4px 0;
  padding-left: 20px;
  position: relative;
}

.errorHint li::before {
  content: "•";
  position: absolute;
  left: 8px;
  color: #666;
}

/* RWD */
@media (max-width: 768px) {
  .errorPage {
    padding: 36px 24px;
  }

  .errorTitle {
    font-size: 1.6rem;
  }

  .errorMessage {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .errorPage {
    padding: 28px 20px;
  }

  .errorLogo {
    width: 60px;
    height: 60px;
  }

  .errorTitle {
    font-size: 1.4rem;
  }

  .errorHint {
    padding: 12px 16px;
  }
}
```

---

### 階段 2: 修復到期圖片重定向循環

#### 2.1 修改 Smart Route 過期檢測邏輯

**位置**: [`src/app/api/smart-route/[hash]/route.ts`](src/app/api/smart-route/[hash]/route.ts:1)

**新增過期檢測**(在密碼檢查之前):
```typescript
// 使用統一介面處理請求
const response = await unifiedAccess.accessImage(accessRequest);

// 🔒 新增:檢查是否過期
const mapping = response.data as ImageMapping | null;
if (mapping?.expiresAt) {
  const expiryDate = new Date(mapping.expiresAt);
  const now = new Date();
  
  if (expiryDate < now) {
    // 圖片已過期,重定向到預覽頁面並帶上過期標記
    const previewUrl = new URL(`/${rawHash}/p`, req.url);
    previewUrl.searchParams.set('expired', 'true');
    
    return NextResponse.redirect(previewUrl, {
      status: 302,
    });
  }
}

// 檢查是否需要密碼驗證
if (mapping?.password) {
  // ... 原有邏輯
}
```

#### 2.2 修改預覽頁面處理過期狀態

**位置**: [`src/app/[hash]/p/page.tsx:59-92`](src/app/[hash]/p/page.tsx:59)

```typescript
useEffect(() => {
  let mounted = true;

  (async () => {
    if (!isHashValid) {
      if (mounted) {
        setError("無效的連結格式");
        setLoading(false);
      }
      return;
    }

    // 🔒 新增:檢查 URL 參數是否標記為過期
    const urlParams = new URLSearchParams(window.location.search);
    const isExpired = urlParams.get('expired') === 'true';
    
    if (isExpired) {
      if (mounted) {
        setError("這個連結已經過期了");
        setMapping(null); // 確保顯示錯誤頁面
        setLoading(false);
      }
      return;
    }

    const result = await fetchMappingMultiBase(hash);
    if (!mounted) return;

    if (!result) {
      setError("找不到資源，或暫時無法取得資料");
      setLoading(false);
      return;
    }

    // 過期檢查(前端再次檢查)
    if (result.expiresAt && new Date(result.expiresAt) < new Date()) {
      setError("這個連結已經過期了");
      setMapping(null); // 顯示錯誤頁面而非內容
      setLoading(false);
      return;
    }

    setMapping(result);
    setLoading(false);
  })();

  return () => {
    mounted = false;
  };
}, [hash, isHashValid]);
```

---

## ✅ 測試計劃

### 測試案例 1: 無效 Hash
- 訪問 `https://duk.tw/invalid123/p`
- 預期: 顯示統一錯誤頁面「找不到這個連結」
- 測試排版是否正常

### 測試案例 2: 到期圖片
- 訪問已過期的圖片(需要先建立測試資料)
- 預期: 顯示「這個連結已經過期了」
- 不應出現重定向循環

### 測試案例 3: 正常圖片
- 訪問正常圖片
- 預期: 正常顯示圖片
- 確認修改不影響正常流程

### 測試案例 4: 密碼保護圖片
- 訪問有密碼的圖片
- 預期: 顯示密碼輸入表單
- 確認密碼流程不受影響

---

## 📊 修改檔案清單

| 檔案 | 修改類型 | 說明 |
|------|---------|------|
| `src/app/[hash]/p/page.tsx` | 🔧 修改 | 統一錯誤頁面結構 + 過期檢測 |
| `src/app/[hash]/page.module.css` | ➕ 新增 | 新增統一錯誤頁面 CSS |
| `src/app/api/smart-route/[hash]/route.ts` | 🔧 修改 | 新增過期檢測邏輯 |

---

## 🎨 視覺設計規格

### 錯誤頁面佈局
```
┌─────────────────────────────┐
│     [Logo - 80x80px]        │ ← 灰階 Logo
│                             │
│     哎呀！(2rem)            │ ← 橘色標題 #ffa940
│                             │
│   找不到這個連結(1.1rem)    │ ← 灰色文字 #ccc
│                             │
│ ┌─ 可能的原因：───────────┐ │
│ │ • 連結輸入錯誤           │ │ ← 半透明面板
│ │ • 圖片已被刪除           │ │
│ │ • 連結已過期             │ │
│ └─────────────────────────┘ │
│                             │
│   [回到首頁 按鈕]           │ ← 紫色按鈕 #9b6bff
└─────────────────────────────┘
```

### 色彩規範
- 背景: `#1f2126`(深灰)
- 主標題: `#ffa940`(橘色)
- 說明文字: `#ccc`(淺灰)
- 提示面板: `rgba(255, 255, 255, 0.05)`(半透明)
- 按鈕: `#9b6bff`(紫色)

---

## 🚀 部署流程

1. ✅ 修改 `page.tsx` 錯誤頁面結構
2. ✅ 新增 CSS 樣式
3. ✅ 修改 Smart Route 過期邏輯
4. ✅ 測試三個案例(無效/過期/正常)
5. ✅ Commit & Push

---

**撰寫時間**: 2025-10-04  
**預計實施時間**: 15 分鐘內