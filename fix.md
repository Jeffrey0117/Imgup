# 修正提案：帶副檔名且受密碼保護時，瀏覽器導向預覽頁（其餘情境不變）

目的
- 當請求路徑包含副檔名（.jpg/.png/…）且該短鏈接設定了密碼：
  - 若為瀏覽器「直接開啟」行為（navigation / Accept: text/html 等），導向預覽頁 /{hash}/p，要求輸入密碼後再看圖。
  - 非瀏覽器圖片情境（img 嵌入、爬蟲、API、HEAD、Accept: image/*）維持當前代理直出行為，不影響現有嵌入。
- 保證其他行為完全不變。此能力以開關配置，預設「關閉」，避免影響現有部署。

現況摘要（已存在的邏輯）
- 智慧路由入口：[EnhancedImageAccess.handleRouting()](src/lib/unified-access.ts:453)
  - 目前已針對「帶副檔名」優先使用代理直出，避免暴露來源
  - 已對「無副檔名但為圖片請求」亦採代理直出
  - 瀏覽器 HTML 請求導向預覽頁（無副檔名情境）
- API 與安全檢查集中在：[GET()](src/app/api/smart-route/[hash]/route.ts:180)
  - 讀取 DB 映射、統計、快取、追蹤
  - 密碼檢查區塊（含預覽頁導向）：[Password block](src/app/api/smart-route/[hash]/route.ts:250)

需求差異
- 現在：帶副檔名的瀏覽器直接開啟多半會代理直出圖片
- 期望：若該短鏈接有密碼，且是瀏覽器直接開啟，則一律導向預覽頁（要求密碼）

設計方案（最小影響、可配置）
1) 新增環境變數（全部可選，預設不更動現狀）
   - SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD=true|false（預設 false）
     - true：啟用「帶副檔名 + 密碼 + 瀏覽器 direct navigation」→ 轉 /{hash}/p
   - SMART_ROUTE_BROWSER_NAV_DETECT_STRICT=true|false（預設 true）
     - 使用 EdgeDetector 的瀏覽器/圖片判定，維持既有判斷，不改 Accept 邏輯時的行為
2) 邏輯修改點
   - 在 [EnhancedImageAccess.handleRouting()](src/lib/unified-access.ts:453) 的「帶副檔名」分支中，加入「有密碼且瀏覽器 direct navigation 且開關為 true」→ redirect 預覽頁；否則延續原本代理直出。
   - 密碼是否存在由上層 GET() 傳遞的 mapping 決定（handleRouting 已持有 mapping）。

擬議演算法（偽代碼）
- 於 handleRouting():
  - if (extension && mapping.url):
    - const cfg = env.SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD === 'true'
    - if (cfg && mapping.password && edgeResult.isBrowserRequest && !edgeResult.isImageRequest):
        - return redirect /{hash}/p
    - else:
        - return proxy image (現狀)
  - 其他分支維持現狀

行為矩陣（啟用開關時）
- 帶副檔名 & 有密碼：
  - 瀏覽器直接開啟 (text/html navigation)：302 → /{hash}/p（新行為）
  - img/爬蟲/API/HEAD (image/* 或非瀏覽器)：代理直出（不變）
- 帶副檔名 & 無密碼：全部沿用現狀
- 無副檔名：全部沿用現狀（HTML → 預覽頁、圖片 → 代理直出）

修改檔案與位置
- [EnhancedImageAccess.handleRouting()](src/lib/unified-access.ts:453)
  - 在 extension 分支前段加入判斷 mapping.password 與 isBrowserRequest 的保護分支（受環境開關控制）
- 無需修改下列（僅確認兼容）：
  - [GET()](src/app/api/smart-route/[hash]/route.ts:180) 內的密碼保護區塊（預覽頁轉向）保留，用於無副檔名情境與後續驗證流程
  - Middleware 不動（[middleware.ts](middleware.ts:1)）

可觀測性
- Log：在新分支打 log（如 &#34;EXT+PWD browser navigation → preview redirect&#34;），便於驗證生效
- Header：維持現有 Cache-Control/Referrer-Policy 等標頭不變
- Metrics：沿用現有 tracking-service，事件類型不變

相容性與風險
- 預設關閉開關，行為 100% 與現況一致
- 開啟後僅在「帶副檔名 + 有密碼 + 瀏覽器 direct navigation」時影響，img 嵌入與 API 不受影響
- 風險：對某些瀏覽器 UA 判斷不準。緩解：保持 edgeResult.isImageRequest 與 isBrowserRequest 的雙重判定，並可通過 SMART_ROUTE_BROWSER_NAV_DETECT_STRICT 調校

驗收標準
- 當 SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD=true：
  - 1) /abc123.jpg（有密碼）在瀏覽器開新分頁 → 302 /abc123/p（需輸密碼）
  - 2) <img src="/abc123.jpg">（有密碼） → 200 代理直出圖片
  - 3) /abc123.jpg（無密碼） → 維持現狀（代理直出）
  - 4) 無副檔名 /abc123（有/無密碼） → 維持現狀
- 當 SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD=false：
  - 全部維持現狀（回歸）

測試計畫
- 單元測試（新增/擴充）
  - [__tests__/api/smart-route-and-extension.test.ts](__tests__/api/smart-route-and-extension.test.ts:1)：
    - 模擬含副檔名 + password 的 mapping，分別以瀏覽器 HTML Accept 與 image Accept 驗證行為
- 端到端（手動）
  - 設定有密碼的短鏈接（DB 直接寫入或 API 建立）
  - 瀏覽器打開含副檔名短鏈接 → 應轉預覽頁
  - 在論壇貼文中用 img 引用 → 正常顯示
- 回歸
  - 未設密碼的所有行為不變
  - 無副檔名情境不變

部署與切換策略
- 變更上線後，預設不生效（開關預設 false）
- 逐步開啟 SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD=true 於測試環境 → 小流量 → 全量
- 若有異常：關閉開關即可即時回退

時程
- Day 0：評審此方案
- Day 1：實作與單元測試（+ 可觀測性 log）
- Day 2：測試環境驗證 + 小流量灰度
- Day 3：正式開啟（若驗證通過）

變更清單（摘要）
- 代碼：
  - [EnhancedImageAccess.handleRouting()](src/lib/unified-access.ts:453) 增加受開關控制的 extension+password 導向預覽判斷
- 配置：
  - 新增 SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD（預設 false）
  - SMART_ROUTE_BROWSER_NAV_DETECT_STRICT（預設 true）

附註
- 上述改動不影響：
  - 上傳流程：[POST](src/app/api/upload/route.ts:47) 與 Provider
  - 使用者認證狀態檢查：[GET](src/app/api/user/auth/status/route.ts:5)
  - 既有的 Edge 判斷與代理/快取 header 邏輯（僅在特定條件下改為 preview redirect）
