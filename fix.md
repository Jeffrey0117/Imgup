# 回滾與最小修補紀錄（2e624f6 基礎）

- 已使用 `git reset --hard 2e624f6` 回到穩定版本
- 僅進行最小修補：圖片預覽頁「複製短網址」按鈕
  - 規範化副檔名：補上 dot、轉小寫；無副檔名則空字串
  - 複製內容使用 `/${hash}${ext}`（或 `origin/${hash}${ext}`）
  - 彈窗提示僅顯示「已複製」
- 變更檔案：
  - src/app/[hash]/p/PreviewClient.tsx
# TypeScript 類型錯誤分析報告

## 問題 1：Prisma JsonValue 類型轉換（已解決）

### 問題描述
在 `src/app/api/admin/backups/mark-inactive/route.ts:106` 發生 TypeScript 編譯錯誤：
```
Type error: Conversion of type 'string | number | boolean | JsonObject | JsonArray' to type 'BackupUrls' may be a mistake
```

### 解決方案
使用 `as unknown as BackupUrls` 雙重轉型解決類型不匹配。

---

## 問題 2：Set 迭代器錯誤（待修正）

### 問題描述
在 `src/app/api/admin/backups/route.ts:90` 發生 TypeScript 編譯錯誤：
```
Type error: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
```

### 根本原因分析

#### 1. TypeScript target 版本問題
- `tsconfig.json` 設定 `target: "es5"`
- ES5 不支援 Set、Map 等 ES6 迭代器協議
- Spread operator `[...]` 需要迭代器支援

#### 2. 錯誤位置
```typescript
providers: [...new Set(backupUrls.backups.map(b => b.provider))]
```

#### 3. 為何會發生
- `new Set()` 建立 ES6 Set 物件
- Spread `[...]` 嘗試迭代 Set
- ES5 target 無法處理 Set 迭代

### 解決方案

#### 方案 A：使用 Array.from()（推薦）
```typescript
providers: Array.from(new Set(backupUrls.backups.map(b => b.provider)))
```
✅ 優點：
- ES5 相容
- 不需修改 tsconfig
- 語意清晰

#### 方案 B：啟用 downlevelIteration
修改 `tsconfig.json`：
```json
{
  "compilerOptions": {
    "downlevelIteration": true
  }
}
```
❌ 缺點：
- 增加編譯後程式碼大小
- 可能影響效能

#### 方案 C：升級 target 到 ES2015+
```json
{
  "compilerOptions": {
    "target": "es2015"
  }
}
```
❌ 缺點：
- 需要測試舊瀏覽器相容性
- 可能影響其他程式碼

### 實作決策
選擇**方案 A（Array.from）**，原因：
1. 最小影響範圍
2. 保持 ES5 target 設定
3. 程式碼可讀性高
4. 不影響編譯後程式碼大小

### 修正實作
將 `[...new Set(...)]` 改為 `Array.from(new Set(...))`
# 回滾與最小修補紀錄

目標
- 回到穩定版本 commit 2e624f6（時光機回去）
- 僅在圖片瀏覽頁（短網址預覽頁）中，修正「複製短網址」按鈕：複製時包含副檔名；彈窗提示僅顯示「已複製」

動作計劃
1) 回滾專案到 2e624f6（重寫歷史）
2) 在 `src/app/[hash]/p/PreviewClient.tsx` 中：
   - 以 mapping.fileExtension 規範化副檔名（補 dot、轉小寫、沒有則空字串）
   - 複製的短網址使用 `/${hash}${ext}`（或 `origin/${hash}${ext}`）
   - 按下複製按鈕後，顯示 1.5 秒的「已複製」簡單提示（不描述副檔名）

風險與處理
- 回滾後需要 force push 以覆蓋遠端歷史
- 僅做最小修補，不引入額外變更

提交說明
- docs: 在 fix.md 記錄回滾與修補決策
- chore: reset --hard 2e624f6 並強制推送
- fix: 預覽頁複製短網址包含副檔名、toast 顯示「已複製」
# 預覽頁「複製短網址未帶副檔名」問題分析與修正方案

附註：/hash/p 預覽頁圖片載入失敗原因與修正
- 現象：如 https://duk.tw/QhoXtc/p 顯示「圖片載入失敗」
- 可能原因：
  1) 以「帶副檔名短鏈」作為圖片 src 時，部分老資料/路由需使用「不帶副檔名短鏈」才能命中
  2) 副檔名推導錯誤或該 hash 未配置對應副檔名
- 調整策略（前端容錯，不改後端）：
  - 先以「帶副檔名」嘗試；onError 第一次回退改用「不帶副檔名」再試一次
  - 再失敗才使用透明占位圖並提示錯誤
- 實作：
  - 新增 shortUrlNoExt，並在 onError 中加入回退（[`PreviewClient.tsx`](src/app/[hash]/p/PreviewClient.tsx:245)）
  - 複製短網址仍使用「帶副檔名」版本，對外分享一致

問題現象
- 首頁顯示與複製的短網址有副檔名
- 預覽頁的「複製短網址」卻沒有副檔名

現況檢視
- 預覽頁組裝副檔名的邏輯僅依賴 [`mapping.fileExtension`](src/app/[hash]/p/PreviewClient.tsx:30)
- 若 `mapping.fileExtension` 為空或 null，則 `normalizedExt` 變為空字串，導致 [`shortUrlWithExt`](src/app/[hash]/p/PreviewClient.tsx:38) 沒有附檔名
- 首頁之所以有附檔名，可能是那邊用 `filename` 或 `url` 來提取副檔名，或後端在該流程有補足

可能原因
1) 預覽頁取得的 `mapping` 未含 `fileExtension`
2) `fileExtension` 大小寫或不含 dot，需要正規化
3) 預覽頁沒有 fallback：`fileExtension` 缺失時，沒有改用 `filename` 或 `url` 來萃取

修正策略（最小、穩定）
- 在預覽頁補齊副檔名推導的 fallback：
  1. 先用 `mapping.fileExtension`
  2. 若無，從 `mapping.filename`（最後一個 dot）推導
  3. 再無，從 `mapping.url` 路徑尾端推導（忽略 query/hash）
- 統一正規化：確保有 dot，並轉小寫（僅接受常見圖片副檔名：.png .jpg .jpeg .gif .webp .svg）
- 最終 `shortUrlWithExt = origin + "/" + hash + ext`

驗收標準
- 預覽頁的「複製短網址」始終有正確副檔名（若可推導）
- 彈窗提示僅顯示「已複製」
- 不更動後端 API 與其他頁面行為

實作項目
- 調整 [`PreviewClient.tsx`](src/app/[hash]/p/PreviewClient.tsx:30) 的 `normalizedExt` 計算，加入多層 fallback 與白名單
- 保留現有「已複製」提示