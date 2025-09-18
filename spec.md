# upimg-nextjs SDD (Software Design Document)

## 專案概述

upimg-nextjs 是一個 Next.js 圖片上傳與分享服務，提供簡潔的拖拽上傳介面、短網址生成、QR Code 分享等功能。

## 功能規格

### 1. 鴨子動畫上傳指示器

**需求描述：**

- 上傳過程中顯示鴨子走路動畫，模擬 GIF 效果
- 使用三張圖片輪流播放：duck_01.png、duck_02.png、duck_03.png
- 動畫下方顯示上傳進度條

**技術實現：**

- 使用 React state 控制圖片切換
- 使用 `setInterval` 實現動畫循環
- 結合上傳 progress 事件顯示進度條

### 2. UX 體驗優化

**需求描述：**

- 優化彈窗關閉邏輯：點擊複製按鈕後立即關閉彈窗，然後顯示複製成功通知
- 在分享連結上方添加 QR Code

**技術實現：**

- 修改彈窗組件的事件處理邏輯
- 整合 QR Code 生成庫（如 qrcode.js）
- 實現彈窗狀態管理

### 3. 短網址系統

**需求描述：**

- 上傳成功後生成短網址格式：`域名/HASH值`
- 創建圖片顯示頁面，路由格式：`/[hash]`
- 頁面內容：顯示對應的圖片 `<img src="圖片網址" />`

**技術實現：**

- 實現 Hash 生成算法
- 創建 Next.js 動態路由 `/[hash]/page.tsx`
- 建立 Hash 到圖片 URL 的映射關係
- 資料庫或檔案系統儲存映射關係

### 4. 過期時間管理

----用下拉選單
5 分鐘
10 分鐘
30 分鐘
1 小時
1 天
7 周
一個月

### 5. 密碼保護功能

**需求描述：**
----只能數字 四位數

**技術實現：**

- 添加密碼設定 UI
- 在訪問短網址時要求輸入密碼
- 實現密碼驗證邏輯

### 6. 介面優化

**需求描述：**

- 縮小複製 MD 和 HTML 按鈕大小
- 保持拖拽區域的 "drop images here" 文字

**技術實現：**

- 調整按鈕 CSS 樣式
- 重新設計按鈕佈局

## 技術架構

### 前端

- **框架：** Next.js 14 (App Router)
- **樣式：** CSS Modules + 全域 CSS
- **狀態管理：** React useState/useEffect
- **動畫：** CSS animations + JavaScript intervals

### 後端

- **API 路由：** Next.js API Routes
- **檔案上傳：** Multipart form handling
- **資料儲存：** JSON 檔案或輕量資料庫

### 資料結構

```typescript
interface UploadedImage {
  id: string; // HASH 值
  filename: string; // 原始檔名
  url: string; // 圖片 URL
  shortUrl: string; // 短網址
  createdAt: Date; // 上傳時間
  expiresAt?: Date; // 過期時間
  password?: string; // 密碼（雜湊後）
}
```

## 檔案結構

```
src/
├── app/
│   ├── [hash]/
│   │   └── page.tsx          # 短網址圖片顯示頁面
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts      # 圖片上傳 API
│   │   ├── shorten/
│   │   │   └── route.ts      # 短網址生成 API
│   │   └── verify/
│   │       └── route.ts      # 密碼驗證 API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # 主頁
├── components/
│   ├── DuckAnimation.tsx     # 鴨子動畫組件
│   ├── UploadProgress.tsx    # 上傳進度組件
│   ├── ShareModal.tsx        # 分享彈窗組件
│   ├── QRCode.tsx           # QR Code 組件
│   ├── ExpirySettings.tsx   # 過期設定組件
│   └── PasswordSettings.tsx # 密碼設定組件
├── utils/
│   ├── hash.ts              # Hash 生成工具
│   ├── storage.ts           # 資料儲存工具
│   └── validation.ts        # 驗證工具
└── types/
    └── upload.ts            # 類型定義
```

## 開發進度 (Progress)

### Phase 1: 基礎功能實現 🟢

- [x] 現有上傳功能
- [x] 鴨子動畫實現
- [x] 上傳進度顯示

### Phase 2: 短網址系統 🔴

- [ ] Hash 生成邏輯
- [ ] 動態路由實現
- [ ] 資料儲存機制

### Phase 3: UX 優化 🔴

- [ ] 彈窗邏輯改善
- [ ] QR Code 功能
- [ ] 按鈕大小調整

### Phase 4: 進階功能 🟢

- [x] 過期時間設定
- [x] 密碼保護
- [x] 錯誤處理

### Phase 5: 測試與優化 🟢

- [x] 功能測試
- [x] 效能優化
- [x] 部署調整

## 待辦事項 (TODO)

### 高優先級

- [x] 實現鴨子動畫組件
- [x] 建立短網址生成 API
- [x] 創建 [hash] 動態路由頁面
- [x] 修改主頁 UI（移除選擇按鈕，添加設定選項）

### 中優先級

- [x] 實現 QR Code 生成
- [x] 優化彈窗關閉邏輯
- [x] 實現過期時間功能
- [x] 調整按鈕樣式
- [x] 整合過期設定組件到主頁面

### 低優先級

- [x] 實現密碼保護
- [x] 添加錯誤處理頁面
- [x] 效能優化
- [x] 文件更新

## 測試計畫 (Test)

### 單元測試

- [x] Hash 生成函數測試
- [x] 資料驗證函數測試
- [x] 日期處理函數測試

### 組件測試

- [x] DuckAnimation 組件測試
- [ ] ShareModal 組件測試
- [x] QRCode 組件測試
- [x] 主頁上傳流程測試

### 整合測試

- [ ] 上傳 → 短網址生成流程測試
- [ ] 短網址存取測試
- [ ] 過期機制測試
- [ ] 密碼保護流程測試

### E2E 測試

- [ ] 完整上傳分享流程
- [ ] 多瀏覽器相容性測試
- [ ] 響應式設計測試
- [ ] 錯誤情境測試

### 測試用例

#### TC001: 鴨子動畫測試

```
描述：驗證上傳時鴨子動畫正常播放
步驟：
1. 拖拽圖片到上傳區域
2. 觀察鴨子動畫是否開始播放
3. 確認三張圖片輪流顯示
4. 確認進度條同步顯示
預期結果：動畫流暢播放，進度條正確顯示
```

#### TC002: 短網址功能測試

```
描述：驗證短網址生成和存取功能
步驟：
1. 上傳圖片成功
2. 獲取生成的短網址
3. 在新分頁開啟短網址
4. 確認圖片正確顯示
預期結果：短網址正常存取並顯示圖片
```

#### TC003: 過期機制測試

```
描述：驗證圖片過期後無法存取
步驟：
1. 上傳圖片並設定短過期時間
2. 等待過期時間
3. 嘗試存取短網址
預期結果：顯示過期或 404 頁面
```

## 部署與維護

### 部署環境

- **平台：** Vercel
- **資料儲存：** Vercel Blob Storage 或本地檔案系統
- **環境變數配置**

### 監控指標

- 上傳成功率
- 平均回應時間
- 儲存空間使用量
- 短網址存取率

### 維護計畫

- 定期清理過期檔案
- 監控儲存空間使用
- 效能指標追蹤
- 安全性更新

---

## 更新記錄

- **2024-12-18:** 初始 SDD 文件建立
- **進行中:** 根據開發進度持續更新
