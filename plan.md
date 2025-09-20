# UpImg NextJS 專案計劃

## 🎯 專案概述

UpImg 是一個圖片上傳與短網址生成服務，支援批次上傳、預覽頁面、以及智能路由（根據 Accept header 判斷回傳圖片或 HTML）。

## 🔧 核心架構

### 智能路由設計

- **問題**: `duk.tw/hash` 既要作為預覽頁，又要支援 `<img src="duk.tw/hash">` 直接引用
- **解決方案**: Accept Header 判斷
  - 瀏覽器訪問 (`text/html`) → 302 redirect 到 `/hash/p` 預覽頁
  - 圖片標籤 (`image/*`) → 直接回傳圖片檔案

### 技術棧

- **前端**: Next.js 14, React, TypeScript, CSS Modules
- **後端**: Next.js API Routes, Prisma ORM
- **資料庫**: (待確認 - PostgreSQL/SQLite)
- **測試**: Jest, React Testing Library
- **部署**: Vercel

## 📋 當前狀態 (v1.3.0)

### ✅ 已完成功能

- [x] 批次上傳 UI/UX
  - 鴨子動畫持續顯示
  - 整體批次進度條
  - 批次完成統計
- [x] 受控併發上傳 (預設並發數: 3)
- [x] 個別圖片進度條
- [x] UI 強化 (紫色漸層按鈕、微動效)
- [x] 智能路由系統
  - Accept Header 判斷邏輯
  - 瀏覽器請求 → 預覽頁面重定向
  - 圖片請求 → 直接圖片重定向
  - API 請求 → JSON 回應
- [x] 優化短網址生成算法
  - 5-6 字元長度 (替代原 11 字元)
  - 防碰撞機制
  - 向後相容性支援
- [x] 測試覆蓋 (Jest 6/6 套件, 35/35 測試通過)

### 🔄 進行中

- [ ] 文件更新 (README + 智能路由說明)

### ⏳ 待完成

- [ ] v1.4.0 短網址服務功能

## 🗓️ 版本規劃

### v1.3.0 - 智能路由 ✅ 已完成 (2025-09-20)

- [x] 實作 Accept Header 判斷邏輯
- [x] 修改 `[hash]/route.ts` 支援圖片直接回傳
- [x] 新增 `[hash]/p/page.tsx` 預覽頁面
- [x] 短網址生成算法優化 (5-6 字元)
- [x] 防碰撞機制實作
- [x] 測試用例更新 (路由判斷)
- [x] 完整測試覆蓋 (35/35 通過)

### v1.4.0 - 短網址服務 (目標: 2025-10-01)

- [ ] 短網址 API 端點
- [ ] 短網址資料庫設計
- [ ] QR Code 生成優化
- [ ] 短網址管理 UI

### v2.0.0 - 進階功能 (目標: 2025-10-15)

- [ ] 使用者認證系統
- [ ] 自訂別名功能
- [ ] 訪問統計
- [ ] 批次管理

## 🧪 測試策略

### 單元測試

- **工具**: Jest + React Testing Library
- **覆蓋範圍**:
  - 元件測試: `DuckAnimation`, `QRCode`
  - 工具函數: `hash.ts`, `storage.ts`
- **目標**: 維持 90%+ 測試覆蓋率

### 整合測試

- **API 端點測試**: `/api/upload`, `/api/shorten`, `/api/mapping`
- **路由測試**: Accept Header 判斷邏輯
- **檔案上傳測試**: 單張、批次、錯誤處理

### 手動測試矩陣

```
[ ] 單張圖片上傳
[ ] 批次圖片上傳 (2-10張)
[ ] 網路中斷情境
[ ] API 失敗處理
[ ] 批次完成提示
[ ] 並發限制驗證
[ ] 進度條準確性
[ ] 響應式設計 (手機/桌面)
```

## 📁 檔案結構

```
src/
├── app/
│   ├── [hash]/
│   │   ├── page.tsx           # 智能路由邏輯
│   │   ├── page.module.css
│   │   └── p/                 # 預覽頁面 (待實作)
│   │       └── page.tsx
│   ├── api/
│   │   ├── upload/route.ts    # 圖片上傳 API
│   │   ├── shorten/route.ts   # 短網址 API
│   │   └── mapping/[hash]/route.ts
│   └── page.tsx               # 主頁面
├── components/
│   ├── DuckAnimation.tsx      # 上傳動畫
│   ├── QRCode.tsx            # QR Code 生成
│   ├── ExpirySettings.tsx    # 過期設定
│   └── PasswordSettings.tsx  # 密碼保護
├── utils/
│   ├── hash.ts               # Hash 生成/驗證
│   └── storage.ts            # 檔案儲存邏輯
└── lib/
    └── prisma.ts             # 資料庫連接
```

## 🚀 部署清單

### 環境變數檢查

- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `STORAGE_API_KEY`
- [ ] `DOMAIN_URL`

### 效能優化

- [ ] 圖片壓縮設定
- [ ] CDN 配置
- [ ] 快取策略 (Browser/CDN)
- [ ] 資料庫連接池

### 監控設置

- [ ] 錯誤追蹤 (Sentry)
- [ ] 效能監控 (Vercel Analytics)
- [ ] 上傳成功率統計
- [ ] API 回應時間監控

## 🎨 未來功能擴展

### 使用者體驗

- [ ] 深色/淺色主題切換
- [ ] 多語言支援 (i18n)
- [ ] 拖曳上傳預覽
- [ ] 圖片壓縮選項

### 企業功能

- [ ] 使用者認證與權限
- [ ] 自訂網域支援
- [ ] API 限流與配額
- [ ] 白牌化選項

### 整合功能

- [ ] 社群媒體分享
- [ ] Markdown/HTML 嵌入工具
- [ ] 第三方儲存整合 (AWS S3, Cloudinary)
- [ ] Webhook 通知

## 🔍 當前優先任務

1. **立即執行** (本週)

   - 完成手動測試矩陣
   - 更新 README 文件
   - 推送當前變更

2. **短期目標** (2 週內)

   - 實作 Accept Header 智能路由
   - 短網址服務基礎功能

3. **中期目標** (1 個月內)
   - 使用者認證系統
   - 基礎統計功能

## 📝 開發注意事項

### 程式碼品質

- 遵循 TypeScript 嚴格模式
- 元件採用 CSS Modules
- API 回應統一格式
- 錯誤處理標準化

### 效能考量

- 圖片上傳並發控制 (預設 3)
- 檔案大小限制 (待設定)
- 資料庫查詢優化
- 前端資源懶載入

### 安全性

- 檔案類型驗證
- 上傳大小限制
- XSS 防護
- CSRF 保護
- 速率限制

---

**最後更新**: 2025-09-20
**版本**: v1.3.0
**下次檢查**: 2025-09-22
