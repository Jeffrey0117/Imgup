# Admin Dashboard UI 設計規範

## 🎨 設計原則

將 Admin Dashboard 的視覺設計與主網站 (ImgUP) 完全統一，創造一致的品牌體驗。

## 🎨 顏色系統

### 主要顏色

```css
--color-bg-primary: #111; /* 主背景 */
--color-bg-panel: #1f2126; /* 面板背景 */
--color-bg-card: #15171d; /* 卡片背景 */
--color-bg-input: #0f1115; /* 輸入框背景 */
--color-bg-header: #17181c; /* 頂部導航背景 */

--color-accent: #9b6bff; /* 主題紫色 */
--color-accent-light: #a36bff; /* 淺紫色 */
--color-success: #3ecf8e; /* 成功綠 */
--color-warning: #ffa940; /* 警告橙 */
--color-error: #ff6b6b; /* 錯誤紅 */
--color-gradient-end: #ff7a59; /* 漸層結束色 */

--color-text-primary: #fff; /* 主要文字 */
--color-text-secondary: #eef; /* 次要文字 */
--color-text-muted: #aaa; /* 淡色文字 */
--color-text-input: #cfe; /* 輸入框文字 */

--color-border: #2a2d33; /* 邊框顏色 */
--color-border-light: #3a3f48; /* 淺邊框 */
--color-border-hover: #4a4f5a; /* hover 邊框 */
```

### 漸層色

```css
--gradient-primary: linear-gradient(135deg, #8e6bff, #a36bff 35%, #ff7a59 100%);
--gradient-border: linear-gradient(45deg, #ffd700, #ffed4e, #ffd700, #ffed4e);
--gradient-purple-pink: linear-gradient(135deg, #9b6bff, #ff7a59);
```

## 📐 間距與佈局

### 圓角系統

```css
--radius-large: 18px; /* 主要容器 */
--radius-medium: 14px; /* 卡片、面板 */
--radius-default: 12px; /* 按鈕、區塊 */
--radius-small: 10px; /* 輸入框 */
--radius-xs: 8px; /* 小元件 */
--radius-mini: 6px; /* 微小元件 */
--radius-pill: 999px; /* 藥丸形 */
```

### 間距規範

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 20px;
--spacing-2xl: 24px;
--spacing-3xl: 32px;
```

## 🎭 陰影效果

```css
--shadow-large: 0 10px 40px rgba(0, 0, 0, 0.5);
--shadow-medium: 0 6px 14px rgba(155, 107, 255, 0.25);
--shadow-hover: 0 15px 35px rgba(155, 107, 255, 0.45);
--shadow-card: 0 2px 4px rgba(0, 0, 0, 0.1);
--shadow-toast: 0 4px 12px rgba(0, 0, 0, 0.5);
```

## 🎬 動畫效果

### 邊框發光動畫

```css
@keyframes borderGlow {
  0% {
    background-position: 0% 50%;
  }
  25% {
    background-position: 100% 0%;
  }
  50% {
    background-position: 100% 100%;
  }
  75% {
    background-position: 0% 100%;
  }
  100% {
    background-position: 0% 50%;
  }
}
```

### 浮動脈衝動畫

```css
@keyframes floatPulse {
  0% {
    transform: translateY(0);
    box-shadow: 0 6px 14px rgba(155, 107, 255, 0.25);
  }
  50% {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(155, 107, 255, 0.4);
  }
  100% {
    transform: translateY(0);
    box-shadow: 0 6px 14px rgba(155, 107, 255, 0.25);
  }
}
```

### 淡入滑動動畫

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## 🔘 按鈕樣式

### 主要按鈕 (Primary)

```css
.primaryButton {
  background: var(--gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-default);
  padding: 12px 18px;
  font-weight: 700;
  box-shadow: var(--shadow-medium);
  transition: transform 0.2s, box-shadow 0.2s;
  animation: floatPulse 3.5s ease-in-out infinite;
}

.primaryButton:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
}
```

### 次要按鈕 (Secondary)

```css
.secondaryButton {
  background: transparent;
  color: #cbd3ff;
  border: 1px solid #454a56;
  border-radius: var(--radius-default);
  padding: 12px 16px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.secondaryButton:hover {
  background: #242831;
  border-color: #555b69;
  transform: translateY(-1px);
}
```

### 危險按鈕 (Danger)

```css
.dangerButton {
  background: linear-gradient(135deg, #ff6b6b, #ff5252);
  color: #fff;
  border: none;
  border-radius: var(--radius-small);
  padding: 10px 16px;
  font-weight: 600;
  transition: all 0.2s ease;
}
```

## 📝 輸入框樣式

```css
.input {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  padding: 10px 14px;
  color: var(--color-text-input);
  font-size: 14px;
  transition: all 0.2s ease;
}

.input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(155, 107, 255, 0.1);
  outline: none;
}
```

## 📦 卡片元件

```css
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  padding: 20px;
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

/* 玻璃擬態卡片 */
.glassCard {
  background: rgba(31, 33, 38, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

## 📊 統計卡片

```css
.statsCard {
  background: linear-gradient(
    135deg,
    var(--color-bg-card),
    rgba(155, 107, 255, 0.1)
  );
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.statsCard::before {
  content: "";
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: var(--gradient-border);
  border-radius: var(--radius-medium);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}

.statsCard:hover::before {
  opacity: 1;
  animation: borderGlow 4s ease-in-out infinite;
}
```

## 📱 響應式設計斷點

```css
/* Desktop Large */
@media (min-width: 1440px) {
}

/* Desktop */
@media (max-width: 1024px) {
}

/* Tablet */
@media (max-width: 768px) {
}

/* Mobile */
@media (max-width: 480px) {
}

/* Mobile Small */
@media (max-width: 375px) {
}
```

## 🎯 實施重點

### Admin Dashboard 需要更新的項目：

1. **背景設計**

   - 移除漸層背景，改用純色 #111
   - 主容器使用 #1f2126 面板色

2. **統計卡片**

   - 加入 borderGlow 動畫效果
   - 使用玻璃擬態設計
   - hover 時的浮動效果

3. **按鈕系統**

   - 主要操作按鈕使用紫色漸層
   - 次要按鈕使用 ghost 風格
   - 危險操作使用紅色漸層

4. **表格設計**

   - 使用 #15171d 作為背景
   - 行 hover 效果
   - 圓角邊框設計

5. **導航欄**

   - 使用 #17181c 背景色
   - 加入品牌 logo
   - 下方加入細微分隔線

6. **動畫增強**
   - 卡片載入時的 slideIn 效果
   - 數字變化時的過渡動畫
   - hover 時的 scale 效果

## 🚀 實作優先級

1. **Phase 1**: 更新色彩系統與背景
2. **Phase 2**: 重構卡片與按鈕樣式
3. **Phase 3**: 加入動畫效果
4. **Phase 4**: 優化響應式設計
5. **Phase 5**: 細節調整與測試
