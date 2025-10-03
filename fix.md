# 404 頁面設計與品牌一致性規劃報告

## 📋 問題描述

**案例 URL**：`https://duk.tw/adminsfsgsgsfgsg/sfgsfg/sfg123`

### 現況問題
```
┌─────────────────────────────────┐
│  Header（品牌導航列）            │  ← ✅ 正常顯示
├─────────────────────────────────┤
│                                 │
│   404                           │  ← ❌ Next.js 預設樣式
│   This page could not be found. │     （無品牌設計）
│                                 │
└─────────────────────────────────┘
```

**問題點**：
1. **視覺斷層**：Header 有品牌設計，404 內容卻是 Next.js 預設樣式
2. **體驗不一致**：與其他頁面（首頁、預覽頁）的視覺語言不統一
3. **品牌形象受損**：錯誤頁面是使用者體驗的重要接觸點，目前呈現專業度不足

---

## 🔍 技術原因分析

### 1. Next.js 404 處理機制

```
使用者訪問 /adminsfsgsgsfgsg/sfgsfg/sfg123
  ↓
Next.js 路由匹配失敗
  ↓
尋找 app/not-found.tsx ← ❌ 當前不存在
  ↓
降級至 Next.js 內建 404 頁面
  ↓
顯示預設樣式：「404 This page could not be found.」
```

### 2. 當前架構缺口

**檔案狀態**：
- ✅ `src/app/layout.tsx`：全域 Layout，包含 Header
- ❌ `src/app/not-found.tsx`：不存在（導致使用預設 404）
- ✅ `src/app/[hash]/page.tsx`：動態路由，但無法捕捉深層無效路徑

**路由層級問題**：
```
/adminsfsgsgsfgsg/sfgsfg/sfg123
  ↓
不匹配任何動態路由（[hash] 只處理單層）
  ↓
直接觸發 404，無客製化處理
```

---

## 💡 解決方案規劃（品牌一致性設計）

### 🏆 方案 A：客製化 404 頁面（推薦）★★★★★

**核心概念**：建立品牌風格的 `not-found.tsx`，與網站整體設計一致

#### 設計要點

**1. 視覺風格**
- 延續首頁的漸層背景與配色（紫色 → 橙色漸層）
- 使用品牌 Logo（小鴨圖示）
- 保持與 Header 的視覺連貫性

**2. 內容策略**
- **友善文案**：避免冷冰冰的技術訊息
- **引導行動**：提供明確的下一步操作
- **品牌個性**：融入「圖鴨」特色（可愛、親切）

**3. 功能設計**
- 快速返回首頁按鈕
- 熱門功能導航
- 搜尋建議（若適用）

#### 實作範例

```tsx
// src/app/not-found.tsx

import Link from 'next/link';
import styles from './page.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.notFoundWrapper}>
        <div className={styles.notFoundContent}>
          {/* 品牌圖示 */}
          <div className={styles.notFoundIcon}>
            <img 
              src="/logo-imgup.png" 
              alt="圖鴨 Logo" 
              style={{ width: 120, height: 120, opacity: 0.8 }}
            />
          </div>

          {/* 主要訊息 */}
          <h1 className={styles.notFoundTitle}>
            找不到這個頁面呱～
          </h1>
          
          <p className={styles.notFoundText}>
            這個連結可能已失效，或是網址輸入錯誤。<br/>
            別擔心，讓我們帶你回到正確的地方！
          </p>

          {/* 行動按鈕組 */}
          <div className={styles.notFoundActions}>
            <Link href="/" className={styles.primaryBtn}>
              回到首頁
            </Link>
            <Link href="/guide" className={styles.secondaryBtn}>
              使用教學
            </Link>
          </div>

          {/* 額外資訊 */}
          <div className={styles.notFoundHint}>
            <p>💡 小提示：確認連結是否完整複製</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### CSS 樣式（整合至 `page.module.css`）

```css
/* 404 頁面容器 */
.notFoundWrapper {
  min-height: calc(100vh - 80px); /* 扣除 Header 高度 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #5f4b8b, #f0a36d);
  padding: 40px 20px;
}

.notFoundContent {
  text-align: center;
  max-width: 600px;
  background: rgba(31, 33, 38, 0.9);
  border-radius: 24px;
  padding: 48px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.notFoundIcon {
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.notFoundTitle {
  font-size: 2.5rem;
  font-weight: 900;
  color: #fff;
  margin: 0 0 16px 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.notFoundText {
  font-size: 1.1rem;
  color: #ddd;
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.notFoundActions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.primaryBtn {
  background: linear-gradient(135deg, #9b6bff, #ff7a59);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(155, 107, 255, 0.3);
}

.primaryBtn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(155, 107, 255, 0.4);
}

.secondaryBtn {
  background: transparent;
  color: #cbd3ff;
  border: 1px solid #454a56;
  border-radius: 12px;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.secondaryBtn:hover {
  background: #242831;
  border-color: #555b69;
  transform: translateY(-2px);
}

.notFoundHint {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 14px;
  color: #999;
}

/* RWD 調整 */
@media (max-width: 768px) {
  .notFoundTitle {
    font-size: 2rem;
  }

  .notFoundText {
    font-size: 1rem;
  }

  .notFoundActions {
    flex-direction: column;
  }

  .primaryBtn,
  .secondaryBtn {
    width: 100%;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .notFoundContent {
    padding: 32px 24px;
  }

  .notFoundTitle {
    font-size: 1.75rem;
  }
}
```

---

### 🥈 方案 B：條件式錯誤頁面（進階）★★★★☆

**概念**：根據不同錯誤類型顯示客製化訊息

#### 錯誤類型分類

1. **無效短網址**：`/xyzabc123` → 「找不到此圖片，可能已過期」
2. **格式錯誤**：`/admin/xyz/123` → 「網址格式錯誤」
3. **路徑不存在**：`/nonexistent/path` → 「頁面不存在」

#### 實作範例

```tsx
// src/app/not-found.tsx

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function NotFound() {
  const pathname = usePathname();

  // 判斷錯誤類型
  const errorType = (() => {
    if (/^\/[a-zA-Z0-9]{6,12}$/.test(pathname)) {
      return 'shorturl';
    }
    if (pathname.includes('/admin')) {
      return 'admin';
    }
    return 'general';
  })();

  const messages = {
    shorturl: {
      title: '找不到這張圖片呱～',
      text: '此圖片可能已過期或連結錯誤。',
      hint: '💡 圖片預設保存 30 天，過期後會自動刪除',
    },
    admin: {
      title: '無權限訪問',
      text: '此頁面需要管理員權限。',
      hint: '🔒 請先登入管理後台',
    },
    general: {
      title: '找不到這個頁面呱～',
      text: '這個連結可能已失效，或是網址輸入錯誤。',
      hint: '💡 小提示：確認連結是否完整複製',
    },
  };

  const msg = messages[errorType];

  return (
    <div className={styles.container}>
      <div className={styles.notFoundWrapper}>
        <div className={styles.notFoundContent}>
          <div className={styles.notFoundIcon}>
            <img src="/logo-imgup.png" alt="圖鴨 Logo" style={{ width: 120, height: 120 }} />
          </div>
          
          <h1 className={styles.notFoundTitle}>{msg.title}</h1>
          <p className={styles.notFoundText}>{msg.text}</p>

          <div className={styles.notFoundActions}>
            <Link href="/" className={styles.primaryBtn}>回到首頁</Link>
            <Link href="/guide" className={styles.secondaryBtn}>使用教學</Link>
          </div>

          <div className={styles.notFoundHint}>
            <p>{msg.hint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 🥉 方案 C：動態路由捕捉（技術優化）★★★☆☆

**概念**：用 `[...slug]` 捕捉所有未匹配路徑

#### 實作步驟

1. **建立 Catch-All 路由**
```tsx
// src/app/[...slug]/page.tsx

import { notFound } from 'next/navigation';

export default function CatchAll({ params }: { params: { slug: string[] } }) {
  // 記錄錯誤路徑（可選）
  console.log('Invalid path:', params.slug.join('/'));
  
  // 觸發 not-found
  notFound();
}
```

2. **優點**
- 可在觸發 404 前執行邏輯（如錯誤追蹤）
- 更細緻的路由控制

3. **缺點**
- 增加路由複雜度
- 可能與現有動態路由衝突

---

## 🎨 設計建議（品牌一致性）

### 1. 文案風格

**❌ 避免**：
- 「404 Error」（技術性過強）
- 「Page Not Found」（冷漠）
- 「出錯了」（負面）

**✅ 推薦**：
- 「找不到這個頁面呱～」（品牌個性）
- 「這裡好像沒有東西耶」（親切）
- 「小鴨迷路了」（可愛）

### 2. 視覺元素

**必備元素**：
1. **品牌 Logo**：建立視覺錨點
2. **漸層背景**：與首頁一致
3. **卡片容器**：提升內容可讀性
4. **CTA 按鈕**：明確引導行動

**可選元素**：
1. **動畫效果**：Logo 浮動、背景粒子
2. **插圖**：404 主題插畫
3. **彩蛋**：隱藏小遊戲

### 3. 互動體驗

**基礎功能**：
- 返回首頁
- 前往使用教學
- 搜尋功能（若有）

**進階功能**：
- 自動重定向（5 秒後）
- 錯誤回報按鈕
- 相關頁面推薦

---

## 📊 實作優先級

### 階段一：基礎實作（30 分鐘）
1. 建立 `src/app/not-found.tsx`
2. 複製首頁樣式架構
3. 加入基本文案與按鈕
4. 測試各種錯誤路徑

### 階段二：視覺優化（1 小時）
1. 整合品牌配色與字型
2. 加入動畫效果
3. RWD 調整
4. A/B 測試文案

### 階段三：功能強化（可選）
1. 條件式錯誤訊息
2. 錯誤追蹤整合
3. 相關內容推薦

---

## 🔬 技術細節補充

### 1. Next.js 404 處理順序

```
1. 檢查 app/not-found.tsx（優先級最高）
   ↓
2. 檢查動態路由的 notFound()
   ↓
3. 降級至 Next.js 預設 404
```

### 2. SEO 考量

```tsx
// src/app/not-found.tsx

export const metadata = {
  title: '找不到頁面 - 圖鴨上床 duk.tw',
  description: '此頁面不存在或已被移除',
  robots: 'noindex, nofollow', // 阻止搜尋引擎索引
};
```

### 3. 錯誤追蹤整合（可選）

```tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    // 記錄 404 事件至 Google Analytics
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'page_not_found', {
        page_path: pathname,
      });
    }
  }, [pathname]);

  // ... rest of component
}
```

---

## ✅ 建議行動方案

### 立即執行（推薦）
1. **實作方案 A**（客製化 404 頁面）
2. 使用提供的程式碼模板
3. 整合至現有樣式系統
4. 測試部署

### 文案建議（三選一）

**選項 1（可愛風）**：
```
標題：找不到這個頁面呱～ 🦆
內文：小鴨找不到你要的東西，可能是連結過期或輸入錯誤囉！
```

**選項 2（專業風）**：
```
標題：頁面不存在
內文：此連結可能已失效，請確認網址是否正確。
```

**選項 3（幽默風）**：
```
標題：404 - 小鴨迷路了
內文：這裡什麼都沒有，就像小鴨的記憶一樣空白 🦆💭
```

---

## 📈 預期效果

### 使用者體驗
- ✅ 視覺一致性：品牌風格貫穿全站
- ✅ 友善引導：明確的下一步行動
- ✅ 情感連結：品牌個性強化

### 技術指標
- ✅ 404 頁面載入 < 100ms
- ✅ 自動追蹤錯誤路徑
- ✅ SEO 正確設定（noindex）

### 商業價值
- 🏆 降低跳出率（提供替代路徑）
- 🏆 提升品牌形象（專業度）
- 🏆 收集錯誤數據（優化產品）

---

## 💬 總結

**核心問題**：Next.js 預設 404 頁面破壞品牌一致性

**最佳解法**：建立客製化 `not-found.tsx`，融入品牌設計語言

**立即行動**：
1. 複製提供的程式碼模板
2. 調整文案符合品牌調性
3. 整合至現有 CSS 架構
4. 測試並部署

**長期優化**：
1. 加入條件式錯誤訊息
2. 整合錯誤追蹤系統
3. A/B 測試文案效果

---

**這份規劃確保 404 頁面不再是體驗斷層，而是品牌價值的延伸。**

**下一步**：請確認要使用的文案風格與設計方向，我將立即建立 `not-found.tsx` 並整合樣式。

---

## 🚨 新發現問題：密碼保護功能失效

### 問題描述
**發現日期**：2025/10/3

**問題現象**：
- 即使設定了密碼的圖片，仍可以直接查看
- 密碼保護機制未正常運作
- 使用者設定的密碼形同虛設

### 初步分析

#### 1. 可能原因
- **前端驗證邏輯問題**：密碼檢查可能只在前端進行，容易被繞過
- **API 權限控制缺失**：後端 API 未正確驗證密碼
- **Session/Token 管理問題**：密碼驗證後的授權狀態未正確管理
- **路由保護不完整**：可能存在直接訪問圖片的路徑

#### 2. 影響範圍
- **安全性風險**：敏感圖片可能被未授權訪問
- **功能可靠性**：核心功能之一失效
- **用戶信任度**：可能影響用戶對產品的信心

### 建議解決方案

#### 方案 A：完整的後端密碼驗證（推薦）
```typescript
// API 端點應該要有的邏輯
// src/app/api/image/[hash]/route.ts
export async function GET(request: Request, { params }: { params: { hash: string } }) {
  const mapping = await getMapping(params.hash);
  
  if (mapping.password) {
    const authHeader = request.headers.get('Authorization');
    const providedPassword = extractPassword(authHeader);
    
    if (!providedPassword || !verifyPassword(providedPassword, mapping.password)) {
      return new Response('Unauthorized', { status: 401 });
    }
  }
  
  // 返回圖片內容
}
```

#### 方案 B：中間件層級的保護
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 檢查是否為需要密碼保護的路徑
  if (pathname.match(/^\/[a-zA-Z0-9]+\/(p)?$/)) {
    // 驗證密碼邏輯
  }
}
```

### 修復計劃

#### 階段一：問題診斷（1小時）
1. 檢查現有密碼驗證流程
2. 追蹤從設定密碼到訪問圖片的完整路徑
3. 確認是前端還是後端的問題

#### 階段二：實作修復（2-3小時）
1. 強化後端 API 的密碼驗證
2. 確保所有訪問路徑都經過驗證
3. 實作安全的 session/token 機制

#### 階段三：測試驗證（1小時）
1. 測試各種訪問場景
2. 確認無法繞過密碼保護
3. 驗證正常使用流程不受影響

### 臨時應對措施
在修復完成前，建議：
1. 提醒用戶暫時不要上傳敏感內容
2. 在介面上標註密碼功能維護中
3. 記錄所有密碼保護的使用情況以便追蹤

### 優先級評估
- **嚴重程度**：高（核心功能失效）
- **影響範圍**：所有使用密碼功能的用戶
- **建議處理時程**：應儘快修復

---

**注意**：此問題暫不修改，僅先記錄與規劃，待確認後再進行修復。
