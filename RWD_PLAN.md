# ImgUP RWD 響應式設計計畫

## 專案概述

ImgUP 是一個圖片上傳工具，目前僅有基礎的響應式設計（在 900px 以下切換為單欄佈局）。本計畫將全面提升 RWD 體驗，確保在所有裝置上都有優秀的使用體驗。

## 一、RWD 斷點策略

### 裝置斷點定義

```css
/* 手機 - 小型 */
@media (max-width: 375px) {
  /* iPhone SE, 小型 Android */
}

/* 手機 - 標準 */
@media (max-width: 480px) {
  /* 大部分手機直向 */
}

/* 平板 - 直向 */
@media (max-width: 768px) {
  /* iPad 直向, 大型手機橫向 */
}

/* 平板 - 橫向 / 小筆電 */
@media (max-width: 1024px) {
  /* iPad 橫向, 小型筆電 */
}

/* 桌面 - 標準 */
@media (min-width: 1025px) {
  /* 標準桌面顯示器 */
}

/* 桌面 - 大型 */
@media (min-width: 1440px) {
  /* 大型顯示器 */
}
```

## 二、各元件 RWD 調整規劃

### 2.1 Header 區域

- **主標題 (mainTitle)**

  - 375px: font-size: 1.5rem
  - 480px: font-size: 1.8rem
  - 768px: font-size: 2rem
  - 1024px+: font-size: 2.2rem

- **副標題 (subTitle)**
  - 375px: font-size: 0.9rem, 單行顯示
  - 480px: font-size: 1rem
  - 768px+: font-size: 1.1rem

### 2.2 主要佈局 (main)

- **375-480px**: 單欄垂直排列
  - drop 區域高度: 280px
  - rightPanel 完全在下方
- **481-768px**: 單欄垂直排列
  - drop 區域高度: 320px
  - 更好的間距
- **769-1024px**: 雙欄佈局
  - grid-template-columns: 1fr 1fr
  - 平均分配空間
- **1025px+**: 現有佈局
  - grid-template-columns: 1.1fr 0.9fr

### 2.3 拖放區域 (drop)

- **手機版優化**
  - 高度自適應視窗
  - 更大的點擊區域
  - 觸控優化的提示文字

### 2.4 圖片列表 (list)

- **手機版**
  - 單行顯示，水平滾動
  - 縮略圖尺寸: 48x48px
  - 簡化的狀態顯示
- **平板版**
  - 保持垂直列表
  - 適度的縮略圖: 56x56px

### 2.5 操作按鈕 (actions)

- **375px**: 垂直堆疊，全寬按鈕
- **480px+**: 水平排列，彈性寬度

### 2.6 輸出區域 (output)

- **手機版**: 高度降至 100px
- **平板版**: 高度 120px
- **桌面版**: 維持 150px

### 2.7 SEO Section (手風琴)

- **手機版**:
  - 減小 padding
  - 調整字體大小
  - 優化 pre 區塊的水平滾動

### 2.8 Toast 通知

- **手機版**: 底部顯示而非頂部
- **調整寬度**: 適應小螢幕

## 三、觸控體驗優化

### 3.1 觸控目標大小

- 最小觸控區域: 44x44px (iOS 標準)
- 按鈕間距: 至少 8px

### 3.2 手勢支援

- 支援觸控拖放上傳
- 滑動刪除圖片項目（手機版）
- 長按顯示圖片選項

## 四、效能優化

### 4.1 CSS 優化

- 使用 CSS Container Queries 進行更精準的響應式控制
- 減少不必要的媒體查詢嵌套

### 4.2 圖片優化

- 縮略圖使用更小的尺寸
- lazy loading 實作

## 五、測試策略

### 5.1 單元測試框架設置

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

### 5.2 測試案例規劃

#### A. 視窗大小測試

1. **測試不同斷點的佈局切換**

   - 375px: 驗證單欄佈局
   - 768px: 驗證平板佈局
   - 1024px: 驗證桌面佈局

2. **測試元件可見性**
   - 確認所有元件在各尺寸下都可見
   - 驗證滾動行為正常

#### B. 互動測試

1. **拖放功能**

   - 桌面: 滑鼠拖放
   - 手機: 觸控選擇檔案

2. **按鈕點擊**
   - 測試觸控區域大小
   - 驗證複製功能

#### C. 樣式測試

1. **字體大小調整**
   - 驗證各斷點的字體大小
2. **間距與對齊**
   - 檢查元件間距
   - 驗證文字對齊

### 5.3 測試檔案結構

```
upimg-nextjs/
├── __tests__/
│   ├── components/
│   │   ├── Home.test.tsx        # 主頁面元件測試
│   │   └── Home.rwd.test.tsx    # RWD 專門測試
│   └── utils/
│       └── test-utils.tsx       # 測試輔助函數
```

### 5.4 測試範例程式碼架構

```typescript
// Home.rwd.test.tsx
describe("RWD Tests", () => {
  describe("Mobile Layout (375px)", () => {
    test("should display single column layout", () => {});
    test("should have appropriate font sizes", () => {});
    test("should handle touch interactions", () => {});
  });

  describe("Tablet Layout (768px)", () => {
    test("should display tablet-optimized layout", () => {});
  });

  describe("Desktop Layout (1024px+)", () => {
    test("should display two-column layout", () => {});
  });
});
```

## 六、實作優先順序

### Phase 1: 基礎 RWD (優先)

1. 更新 CSS 媒體查詢
2. 調整字體大小響應式
3. 優化手機版佈局

### Phase 2: 互動優化

1. 觸控體驗改善
2. 手勢支援
3. 動畫優化

### Phase 3: 測試完善

1. 設置測試環境
2. 撰寫 RWD 測試案例
3. 執行測試並修正問題

## 七、CSS 變數系統

建議新增 CSS 變數以便管理不同斷點的樣式：

```css
:root {
  /* 字體大小 */
  --fs-title-mobile: 1.5rem;
  --fs-title-tablet: 2rem;
  --fs-title-desktop: 2.2rem;

  /* 間距 */
  --spacing-mobile: 12px;
  --spacing-tablet: 18px;
  --spacing-desktop: 22px;

  /* 元件高度 */
  --drop-height-mobile: 280px;
  --drop-height-tablet: 320px;
  --drop-height-desktop: 420px;
}
```

## 八、瀏覽器相容性

### 目標瀏覽器

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Chrome Mobile
- Safari iOS

### Polyfills 需求

- CSS Container Queries (如使用)
- Touch Events

## 九、無障礙性考量

### ARIA 屬性

- 為互動元件添加適當的 ARIA 標籤
- 確保鍵盤導航支援

### 顏色對比

- 確保文字與背景對比度符合 WCAG AA 標準
- 提供高對比模式選項

## 十、效能指標目標

### Lighthouse 分數目標

- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: 100

### Core Web Vitals

- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

---

## 下一步行動

1. **Code Mode 實作清單**：

   - [ ] 安裝測試相關套件
   - [ ] 更新 page.module.css 加入完整媒體查詢
   - [ ] 調整 page.tsx 元件結構以支援 RWD
   - [ ] 建立測試檔案架構
   - [ ] 撰寫 RWD 測試案例
   - [ ] 執行測試並優化

2. **驗證檢查點**：
   - [ ] Chrome DevTools 響應式測試
   - [ ] 實機測試 (iOS/Android)
   - [ ] Lighthouse 評分
   - [ ] 測試覆蓋率 > 80%
