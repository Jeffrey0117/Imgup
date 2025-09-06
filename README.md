# Upimg Next.js

一個基於 Next.js 的圖片批量上傳工具，可以將圖片上傳到伺服器並生成 Markdown 格式的連結。

## 功能特色

- 🖼️ 支援拖拽上傳多張圖片
- 📝 自動生成 Markdown 格式的圖片連結
- 🚀 使用 Next.js App Router 和 Server-side fetch
- 📱 響應式設計，支援手機和桌面
- ⚡ 即時上傳進度顯示

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
