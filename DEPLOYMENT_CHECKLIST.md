# 🚀 Vercel 部署檢查清單

## ✅ 已完成項目

### 1. 資料庫整合

- ✅ 從 localStorage 成功遷移至 Neon PostgreSQL
- ✅ Prisma Schema 正確配置
- ✅ 資料庫連線字串已設定於 .env
- ✅ Prisma Client 正常運作

### 2. 程式碼修復

- ✅ 修正 hash 一致性問題
- ✅ 前端使用後端回傳的 shortUrl
- ✅ 時區設定為 UTC+8 台灣時間
- ✅ 清理 Webpack 編譯錯誤

### 3. package.json 更新

- ✅ 新增 `prisma generate` 到 build script
- ✅ 新增 `postinstall` script 自動生成 Prisma Client
- ✅ 新增 prisma 到 devDependencies

## 📋 Vercel 部署步驟

### 1. 環境變數設定

在 Vercel Dashboard 中設定以下環境變數：

```
DATABASE_URL="postgresql://neondb_owner:npg_RW1aqJ9VkSBE@ep-shiny-frog-a1ualcab-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

### 2. Build 設定

- Build Command: `npm run build` (已自動包含 prisma generate)
- Output Directory: `.next`
- Install Command: `npm install` (會自動執行 postinstall)

### 3. Function 配置

vercel.json 已配置：

- `/api/upload` 最大執行時間：30 秒

## 🔍 本地測試結果

### 功能測試

| 功能       | 狀態 | 說明                           |
| ---------- | ---- | ------------------------------ |
| 主頁載入   | ✅   | http://localhost:3001 正常載入 |
| 圖片上傳   | ✅   | 使用者已確認功能正常           |
| 短網址生成 | ✅   | 正確生成並儲存到資料庫         |
| 短網址訪問 | ✅   | 可跨瀏覽器/無痕模式使用        |
| 資料庫連線 | ✅   | Neon PostgreSQL 連線正常       |

### 技術驗證

| 項目       | 狀態 | 說明                  |
| ---------- | ---- | --------------------- |
| Next.js 14 | ✅   | 應用程式正常運行      |
| Prisma ORM | ✅   | 資料庫操作正常        |
| API Routes | ✅   | 所有 API 端點正常回應 |
| 靜態資源   | ✅   | 圖片、字型正常載入    |

## ⚠️ 注意事項

1. **Prisma 權限問題**

   - Windows 環境可能出現檔案權限問題
   - Vercel 部署時不會有此問題
   - 本地開發建議使用管理員權限執行

2. **資料庫連線**

   - 確保 DATABASE_URL 已正確設定
   - Neon 資料庫需要 SSL 連線

3. **部署前檢查**
   - 確認所有環境變數已設定
   - 檢查 .gitignore 包含 .env
   - 確認 prisma 在 devDependencies

## 📊 資料庫架構

```prisma
model Mapping {
  id          Int      @id @default(autoincrement())
  shortUrl    String   @unique
  originalUrl String
  createdAt   DateTime @default(now())

  @@index([shortUrl])
}
```

## 🎯 下一步

1. 推送至 GitHub
2. 在 Vercel 中匯入專案
3. 設定環境變數
4. 部署並測試線上版本

---

最後更新：2025-01-20 00:52 (UTC+8)
