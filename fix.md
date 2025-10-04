# 重定向循環安全性診斷報告

## 🚨 緊急事件概述

**時間**: 2025-10-04  
**嚴重性**: ⚠️ 中高風險  
**影響範圍**: 特定 Hash 值觸發無限重定向循環

### 問題描述
使用者上傳三張圖片後,訪問短網址時出現「duk.tw 將您重新導向的次數過多」錯誤,瀏覽器提示刪除 Cookie。

**疑似問題檔案**:
1. `https://duk.tw/NfBJlx`
2. `https://duk.tw/i8XXoO`
3. `https://duk.tw/odtBxN`

---

## 🔍 根本原因分析

### 1. 重定向循環成因

經過程式碼審查([`src/app/api/smart-route/[hash]/route.ts`](src/app/api/smart-route/[hash]/route.ts:1), [`src/app/[hash]/page.tsx`](src/app/[hash]/page.tsx:1)),發現以下潛在循環路徑:

#### 循環路徑 A: 密碼保護無限重定向
```
1. 使用者訪問 /{hash}
2. middleware.ts 放行 → 到達 [hash]/page.tsx
3. [hash]/page.tsx:17 無條件 redirect(/{hash}/p)
4. /{hash}/p 請求 /api/mapping/{hash} 取得資料
5. Smart Route 檢查密碼 → 重定向到 /{hash}/p (line 232)
6. /{hash}/p 已經在密碼保護頁面,但又被重定向到自己
7. 回到步驟 5 → 無限循環
```

**關鍵程式碼**:
```typescript
// src/app/api/smart-route/[hash]/route.ts:230-235
if (!authCookie || authCookie.value !== 'verified') {
  // 需要密碼但沒有驗證,重定向到預覽頁面
  return NextResponse.redirect(new URL(`/${rawHash}/p`, req.url), {
    status: 302,
  });
}
```

**問題**: Smart Route API 不應該處理 `/p` 預覽頁面的請求,但如果被呼叫時仍會執行重定向邏輯。

#### 循環路徑 B: [hash]/page.tsx 無條件重定向
```typescript
// src/app/[hash]/page.tsx:17
redirect(`/${params.hash}/p`);
```

**問題**: 所有訪問 `/{hash}` 的請求都被強制重定向至 `/p`,沒有任何例外處理。

### 2. 為何自己測試沒遇到?

可能原因:
1. **Cookie 狀態差異**: 你測試時可能已有 `auth_{hash}` cookie
2. **密碼設定差異**: 你的測試圖片可能沒有設定密碼
3. **瀏覽器快取**: 你的瀏覽器已快取正確的響應
4. **時序問題**: 特定條件下(如 Redis 延遲)才觸發

---

## 🛡️ 安全性評估

### 是否為攻擊行為?

**結論**: ❌ 幾乎可確定 **不是攻擊**,而是 **系統 Bug**

#### 證據:
1. **攻擊者無動機**: 重定向循環只會導致服務不可用,無法竊取 Cookie 或資料
2. **Cookie 安全**: 瀏覽器提示「刪除 Cookie」是標準防禦機制,非洩漏風險
3. **圖片檔案無法偽造攻擊**: 上傳的圖片經過後端驗證([`src/utils/file-validation.ts`](src/utils/file-validation.ts:1)),無法直接執行程式碼

#### 可能的攻擊向量(已排除):
| 攻擊類型 | 風險評估 | 說明 |
|---------|---------|------|
| XSS(跨站腳本) | ❌ 無風險 | 圖片檔案不執行 JavaScript |
| CSRF(跨站請求偽造) | ⚠️ 低風險 | 需要檢查 Cookie SameSite 設定 |
| Cookie 竊取 | ❌ 無風險 | 重定向不涉及 Cookie 傳輸 |
| DoS(阻斷服務) | ⚠️ 中風險 | 大量循環請求可能耗盡伺服器資源 |

---

## 🔧 修復方案

### 方案 1: 修正 Smart Route 密碼檢查邏輯(推薦)

**問題**: Smart Route API 不應對 `/p` 預覽頁面請求進行重定向

**修改位置**: [`src/app/api/smart-route/[hash]/route.ts:223-236`](src/app/api/smart-route/[hash]/route.ts:223)

```typescript
// 修改前
if (mapping?.password) {
  const cookies = req.cookies;
  const authCookie = cookies.get(`auth_${rawHash}`);
  
  if (!authCookie || authCookie.value !== 'verified') {
    return NextResponse.redirect(new URL(`/${rawHash}/p`, req.url), {
      status: 302,
    });
  }
}

// 修改後
if (mapping?.password) {
  const cookies = req.cookies;
  const authCookie = cookies.get(`auth_${rawHash}`);
  
  // 🔒 新增檢查:如果已經在預覽頁面,不要重定向
  const isPreviewPage = req.url.includes(`/${rawHash}/p`);
  
  if (!authCookie || authCookie.value !== 'verified') {
    if (!isPreviewPage) {
      return NextResponse.redirect(new URL(`/${rawHash}/p`, req.url), {
        status: 302,
      });
    }
    // 如果已在預覽頁面,讓它正常載入(顯示密碼表單)
  }
}
```

### 方案 2: 修正 [hash]/page.tsx 邏輯

**問題**: 無條件重定向導致無法正常顯示圖片

**修改位置**: [`src/app/[hash]/page.tsx:8-17`](src/app/[hash]/page.tsx:8)

```typescript
// 修改前
export default async function SmartRoutePage({ params }: Props) {
  if (!isValidHash(params.hash)) {
    redirect("/");
  }
  redirect(`/${params.hash}/p`);
}

// 修改後
export default async function SmartRoutePage({ params }: Props) {
  if (!isValidHash(params.hash)) {
    redirect("/");
  }
  
  // 🔒 新增:檢查是否有密碼,只有需要密碼時才重定向
  const mapping = await prisma.mapping.findUnique({
    where: { hash: params.hash },
    select: { password: true }
  });
  
  if (mapping?.password) {
    redirect(`/${params.hash}/p`);
  }
  
  // 無密碼保護時,直接顯示圖片(透過 Smart Route API)
  redirect(`/api/smart-route/${params.hash}`);
}
```

### 方案 3: 加強 Middleware 防護

**修改位置**: [`middleware.ts:4-14`](middleware.ts:4)

```typescript
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 🔒 新增:檢測重定向循環
  const referer = request.headers.get('referer');
  if (referer && referer.includes(pathname)) {
    // 可能的重定向循環,直接顯示錯誤頁面
    return NextResponse.redirect(new URL('/error?code=redirect_loop', request.url));
  }
  
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }
  
  return NextResponse.next();
}
```

---

## 🛡️ 安全加固建議

### 1. Cookie 安全性強化

**修改位置**: 密碼驗證 API

```typescript
// 設定 Cookie 時加入安全標記
response.cookies.set(`auth_${hash}`, 'verified', {
  httpOnly: true,      // 防止 XSS 讀取
  secure: true,        // 僅 HTTPS 傳輸
  sameSite: 'strict',  // 防止 CSRF
  maxAge: 3600,        // 1 小時後過期
  path: `/${hash}`     // 限定路徑
});
```

### 2. 速率限制(Rate Limiting)

防止大量重定向請求耗盡資源:

```typescript
// src/middleware/rate-limit.ts
const redirectLimit = new Map<string, number>();

export function checkRedirectRate(ip: string): boolean {
  const count = redirectLimit.get(ip) || 0;
  if (count > 10) return false; // 10 次/分鐘
  redirectLimit.set(ip, count + 1);
  setTimeout(() => redirectLimit.delete(ip), 60000);
  return true;
}
```

### 3. 日誌監控

記錄重定向循環事件:

```typescript
if (redirectCount > 3) {
  console.error(`[SECURITY] Redirect loop detected: ${hash}`, {
    ip: request.ip,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  });
}
```

---

## 📊 風險評估總結

| 風險類型 | 嚴重性 | 影響範圍 | 優先級 |
|---------|-------|---------|-------|
| 重定向循環(DoS) | 🟡 中 | 特定 Hash | P1(立即修復) |
| Cookie 洩漏 | 🟢 低 | 無 | P3(觀察) |
| XSS 攻擊 | 🟢 低 | 無 | P4(已防禦) |
| 資源耗盡 | 🟡 中 | 全站 | P2(加強監控) |

---

## ✅ 立即行動計劃

1. **立即實施方案 1**(修正 Smart Route 密碼檢查邏輯)
2. **部署速率限制**防止資源耗盡
3. **加入日誌監控**追蹤異常請求
4. **通知受影響使用者**清除 Cookie 後重試

---

## 🔍 三個疑似檔案分析

### NfBJlx, i8XXoO, odtBxN

**初步診斷**:
- 這些檔案可能在上傳時設定了密碼保護
- 觸發了密碼驗證流程
- 因 Smart Route 邏輯缺陷導致重定向循環

**建議操作**:
```bash
# 檢查這三個 Hash 的資料庫記錄
psql $DATABASE_URL -c "SELECT hash, password, expiresAt FROM mappings WHERE hash IN ('NfBJlx', 'i8XXoO', 'odtBxN');"
```

**臨時解決方案**:
1. 清除使用者 Cookie:`document.cookie.split(";").forEach(c => document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC")`
2. 使用無痕視窗訪問
3. 等待修復部署後重試

---

**報告完成時間**: 2025-10-04  
**下一步**: 實施方案 1 並部署至 production