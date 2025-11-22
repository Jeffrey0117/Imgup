# duk.tw Cloudflare Proxy Worker

> **從 $498/月降到 < $5/月 - 節省 99% 成本的圖片代理方案**

## 🚨 為什麼需要這個？

你的 Vercel 帳單顯示：
- **Fast Data Transfer**: 4.09 TB = **$493.56**
- **總成本**: $498.38/月

這個流量是 `/api/proxy-image` 在 Vercel 上執行造成的。遷移到 Cloudflare Workers 後：
- **Cloudflare Workers Bandwidth**: 免費（無限流量）
- **Cloudflare Workers Requests**: 每天 100,000 次免費
- **預期成本**: < $5/月

**節省 97.5% 成本！**

---

## 📋 快速部署指南（15 分鐘）

### 步驟 1：安裝 Wrangler CLI

```bash
npm install -g wrangler

# 驗證安裝
wrangler --version
```

### 步驟 2：登入 Cloudflare

```bash
wrangler login
```

這會打開瀏覽器，登入你的 Cloudflare 帳號並授權。

### 步驟 3：創建 KV Namespace（Rate Limiting 用）

```bash
cd cloudflare-proxy-worker

# 創建 KV Namespace
wrangler kv:namespace create "RATE_LIMIT_KV"
```

**輸出範例：**
```
✅ Successfully created KV namespace "RATE_LIMIT_KV"
📋 ID: YOUR_KV_NAMESPACE_ID_HERE
```

**複製這個 ID**，然後更新 `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_KV_NAMESPACE_ID_HERE"  # 替換為你的 ID
```

### 步驟 4：本地測試（可選）

```bash
# 安裝dependencies
npm install

# 本地開發模式
npm run dev
```

測試 URL：`http://localhost:8787/image?url=https://example.com/image.jpg`

### 步驟 5：部署到 Cloudflare

```bash
npm run deploy
```

**輸出範例：**
```
✅ Successfully deployed to Cloudflare Workers
🌐 URL: https://duktwimg-proxy.YOUR_SUBDOMAIN.workers.dev
```

**記下這個 URL！**

### 步驟 6：設置自定義域名（推薦）

#### 方法 A：在 Cloudflare Dashboard

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → duktwimg-proxy → Settings → Domains & Routes
3. 點擊 "Add Custom Domain"
4. 輸入：`proxy.duk.tw`
5. 點擊 "Add Domain"

#### 方法 B：使用 Wrangler

```bash
wrangler domains add proxy.duk.tw
```

**驗證：**
```bash
curl https://proxy.duk.tw/image?url=https://httpbin.org/image/jpeg
```

如果返回圖片，就成功了！

### 步驟 7：更新前端環境變數

#### 開發環境（`.env.local`）

創建或編輯 `.env.local`（在專案根目錄）：

```env
# Cloudflare Proxy Worker URL
NEXT_PUBLIC_PROXY_URL=https://proxy.duk.tw/image

# 或使用 workers.dev 域名（如果還沒設置自定義域名）
# NEXT_PUBLIC_PROXY_URL=https://duktwimg-proxy.YOUR_SUBDOMAIN.workers.dev/image
```

#### 生產環境（Vercel）

前往 [Vercel Dashboard](https://vercel.com/):

1. 選擇你的專案
2. Settings → Environment Variables
3. 添加新變數：
   - **Name**: `NEXT_PUBLIC_PROXY_URL`
   - **Value**: `https://proxy.duk.tw/image`
   - **Environment**: Production

### 步驟 8：部署前端到 Vercel

```bash
# 在專案根目錄
git add .
git commit -m "feat: migrate proxy to Cloudflare Workers - save 99% cost"
git push origin main
```

Vercel 會自動部署。

### 步驟 9：驗證成功

1. 前往你的 Admin Dashboard：`https://duk.tw/admin-new`
2. 檢查圖片是否正常顯示
3. 打開瀏覽器 DevTools → Network 標籤
4. 確認圖片請求是到 `proxy.duk.tw`（而非 `/api/proxy-image`）

---

## 🧪 測試

### 本地測試

```bash
# 1. 測試基本功能
curl "http://localhost:8787/image?url=https://httpbin.org/image/jpeg"

# 2. 測試 Referer 檢查（應該被拒絕）
curl -H "Referer: https://evil.com" \
  "http://localhost:8787/image?url=https://httpbin.org/image/jpeg"

# 3. 測試 User-Agent 黑名單（應該被拒絕）
curl -A "python-requests/2.28.0" \
  "http://localhost:8787/image?url=https://httpbin.org/image/jpeg"

# 4. 測試 Rate Limiting（快速請求 35 次，第 31 次應該被拒絕）
for i in {1..35}; do
  curl "http://localhost:8787/image?url=https://httpbin.org/image/jpeg"
  echo "Request $i"
done
```

### 生產測試

替換 `localhost:8787` 為 `proxy.duk.tw`：

```bash
curl -H "Referer: https://duk.tw" \
  "https://proxy.duk.tw/image?url=https://httpbin.org/image/jpeg"
```

---

## 📊 監控成本

### Cloudflare Workers 監控

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → duktwimg-proxy → Metrics

查看：
- 請求次數
- CPU 使用時間
- 錯誤率

### 預期使用量

根據你的 Vercel 帳單：
- 4.09 TB ÷ 2MB/圖 ≈ 200 萬次請求/月
- 200 萬 ÷ 30 天 ≈ 67,000 次/天

**完全在免費額度內（每天 100,000 次）！**

即使超過：
- $0.50 per million requests
- 200 萬次/月 = $1/月
- Bandwidth 永遠免費

---

## ⚙️ 配置選項

### 調整 Rate Limiting

編輯 `src/index.ts`：

```typescript
// 從 30 次/分鐘改為 60 次/分鐘
const RATE_LIMIT_PER_MINUTE = 60;
```

重新部署：
```bash
npm run deploy
```

### 添加更多允許的 Referer

編輯 `src/index.ts`：

```typescript
const ALLOWED_REFERERS = [
  'duk.tw',
  'localhost',
  '127.0.0.1',
  'yourotherdomain.com',  // 添加更多
];
```

### 自定義緩存策略

編輯 `src/index.ts`：

```typescript
// 將緩存時間從 24 小時改為 7 天
'Cache-Control': 'public, max-age=604800',
```

---

## 🐛 故障排除

### 問題 1：Worker 部署失敗

**錯誤：** `✘ [ERROR] No account id found`

**解決：**
```bash
wrangler login
wrangler whoami
```

### 問題 2：KV Namespace 找不到

**錯誤：** `✘ [ERROR] Binding "RATE_LIMIT_KV" is not defined`

**解決：** 確認你有執行 `wrangler kv:namespace create` 並更新 `wrangler.toml`

### 問題 3：圖片無法顯示

**檢查清單：**
1. 確認前端環境變數設置正確（`NEXT_PUBLIC_PROXY_URL`）
2. 確認 Worker 已部署
3. 檢查瀏覽器 DevTools → Console 是否有錯誤
4. 確認 Referer header 正確

### 問題 4：403 Forbidden

**原因：** Referer 檢查失敗

**解決：**
- 確認你是從 `duk.tw` 或 `localhost` 訪問
- 檢查 Worker logs：`wrangler tail`

---

## 📝 維護

### 查看 Worker 日誌

```bash
cd cloudflare-proxy-worker
wrangler tail
```

### 更新 Worker 代碼

```bash
# 編輯 src/index.ts
npm run deploy
```

### 回滾到 Vercel Proxy（緊急情況）

如果 Cloudflare Worker 出問題，可以快速回滾：

1. 在 Vercel 環境變數中刪除 `NEXT_PUBLIC_PROXY_URL`
2. 重新部署前端

系統會自動 fallback 到 `/api/proxy-image`

---

## 🎯 預期效果

### 成本比較

| 項目 | 遷移前 (Vercel) | 遷移後 (Cloudflare) | 節省 |
|------|----------------|-------------------|------|
| Fast Data Transfer | $493.56 | $0 | 100% |
| Fast Origin Transfer | $18.76 | < $1 | 95% |
| Cloudflare Workers | - | $0 | - |
| **總計** | **$498.38** | **< $5** | **99%** |

### 效能提升

- **響應時間**: 降低到 < 50ms（Cloudflare 全球 CDN）
- **緩存命中率**: 提升到 90%+（Cloudflare 強大緩存）
- **可用性**: 99.99% SLA（Cloudflare Workers）

---

## 🔒 安全措施

Worker 包含以下安全防護：

- ✅ Referer 白名單檢查
- ✅ User-Agent 黑名單
- ✅ Rate Limiting (30 次/分鐘/IP)
- ✅ 只允許 HTTP/HTTPS 協議
- ✅ CORS 限制
- ✅ 完整錯誤處理

---

## 📚 相關文件

- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文檔](https://developers.cloudflare.com/workers/wrangler/)
- [KV Storage 文檔](https://developers.cloudflare.com/kv/)

---

## 🆘 支援

遇到問題？

1. 檢查上面的故障排除章節
2. 查看 Worker 日誌：`wrangler tail`
3. 查看詳細遷移文檔：`private-research/CLOUDFLARE_PROXY_MIGRATION.md`

---

**最後更新：2025-11-22**
**預期節省：$493/月 → 99% 成本優化**
