# Upimg Next.js

一個基於 Next.js 的圖片批量上傳工具，可以將圖片上傳到伺服器並生成 Markdown 格式的連結。

## 功能特色

- 🖼️ 支援拖拽上傳多張圖片
- 📝 自動生成 Markdown 格式的圖片連結
- 🚀 使用 Next.js App Router 和 Server-side fetch
- 📱 響應式設計，支援手機和桌面
- ⚡ 即時上傳進度顯示（整體批次進度與每張圖片進度）
- 🧵 受控併發上傳（預設同時 3 張，速度與穩定兼顧）
- 🎛️ 強化按鈕設計（開始上傳更顯眼、Clear 次要化）

## 技術棧

- **Next.js 14** - React 框架
- **TypeScript** - 類型安全
- **CSS Modules** - 樣式管理
- **Server-side fetch** - API 調用

## 安裝和運行

1. 安裝依賴：

```bash
npm install
```

2. 啟動開發伺服器：

```bash
npm run dev
```

3. 在瀏覽器中打開 [http://localhost:3000](http://localhost:3000)

## 使用方式

1. 在 `_token` 欄位輸入您的 API token
2. 拖拽圖片到上傳區域或點擊選擇圖片
3. 點擊「開始上傳」按鈕
4. 等待上傳完成後，點擊「複製 Markdown」獲取格式化的連結

## 批次與併發說明

- 批次期間：鴨子動畫持續顯示，進度條代表整體批次進展
- 每項進度：每張圖片於列表中獨立顯示進度
- 受控併發：預設同時上傳 3 張，單筆失敗不影響其他項目
- 建議：大量上傳時請分批，避免對外部 API 造成壓力

## 設計變更

- 「開始上傳」採紫色系漸層與微動效，提升可見度
- 「Clear」為次要樣式，避免誤觸

## 測試

- 單元測試：`npm test`
- 手動測試清單：單張、批次、網路中斷、API 失敗、完成提示

## API 路由

- `POST /api/upload` - 處理圖片上傳請求

## 專案結構

```
upimg-nextjs/
├── src/
│   └── app/
│       ├── api/
│       │   └── upload/
│       │       └── route.ts      # 上傳 API 路由
│       ├── layout.tsx            # 根布局
│       ├── page.tsx              # 主頁面組件
│       └── page.module.css       # 樣式文件
├── package.json
├── next.config.ts
└── tsconfig.json
```
