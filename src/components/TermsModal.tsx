"use client";

import { useEffect } from "react";
import styles from "./TermsModal.module.css";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  // ESC 鍵關閉
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  // 防止背景滾動
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="terms-title" className={styles.title}>
            duk.tw 使用者條款與隱私權政策
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="關閉條款視窗"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3>服務概述</h3>
            <p>
              duk.tw 是一個免費的圖片上傳與分享服務，提供快速、安全的圖片儲存和分享功能。服務使用 Next.js 技術架構，支援拖放上傳、短網址生成、QR Code 分享等功能。
            </p>
            <p><strong>服務時間：</strong> 2025 年 1 月 1 日起生效</p>
            <p><strong>最後更新：</strong> 2025 年 9 月 22 日</p>
          </div>

          <div className={styles.section}>
            <h3>1. 服務使用限制</h3>

            <h4>檔案上傳限制</h4>
            <ul>
              <li><strong>單檔案大小限制</strong>：最大 5MB（可調整至 10MB）</li>
              <li><strong>同時上傳數量</strong>：單次最多 1 個檔案</li>
              <li><strong>支援的檔案格式</strong>：JPG、PNG、GIF、WebP、SVG</li>
              <li><strong>檔案名稱限制</strong>：不得包含特殊字元或惡意程式碼</li>
            </ul>

            <h4>速率限制（Rate Limiting）</h4>
            <ul>
              <li><strong>圖片上傳頻率</strong>：每分鐘最多 3 次</li>
              <li><strong>一般 API 請求</strong>：每分鐘最多 60 次</li>
              <li><strong>管理 API 請求</strong>：每分鐘最多 3 次</li>
              <li><strong>違規冷卻機制</strong>：超過限制將進入指數遞增冷卻期</li>
            </ul>

            <h4>內容保存期限</h4>
            <ul>
              <li><strong>預設保存期限</strong>：圖片上傳後 1 個月自動過期</li>
              <li><strong>可調整期限</strong>：5 分鐘至 1 個月（需在設定中指定）</li>
              <li><strong>手動刪除</strong>：管理員可隨時刪除任何檔案</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>2. 安全與隱私政策</h3>

            <h4>資料安全</h4>
            <ul>
              <li><strong>檔案驗證</strong>：所有上傳檔案都會進行 Magic Number 簽名驗證</li>
              <li><strong>惡意內容檢測</strong>：自動掃描並阻擋可疑檔案</li>
              <li><strong>來源驗證</strong>：僅允許白名單來源進行上傳</li>
              <li><strong>IP 管理</strong>：可疑 IP 將被自動記錄並限制</li>
            </ul>

            <h4>隱私保護</h4>
            <ul>
              <li><strong>資料匿名化</strong>：上傳記錄不會與個人身份直接關聯</li>
              <li><strong>存取控制</strong>：只有管理員能查看完整存取記錄</li>
              <li><strong>審計日誌</strong>：所有管理操作都會記錄以供追蹤</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>3. 服務使用條款</h3>

            <h4>允許使用</h4>
            <ul>
              <li>個人圖片分享與儲存</li>
              <li>網頁開發中的臨時圖片資源</li>
              <li>社群媒體圖片分享</li>
              <li>教育與學習用途</li>
            </ul>

            <h4>禁止行為</h4>
            <ul>
              <li><strong>非法內容</strong>：任何違法、淫穢或侵犯版權的內容</li>
              <li><strong>惡意檔案</strong>：病毒、木馬或其他惡意程式</li>
              <li><strong>濫用行為</strong>：大量自動化上傳或攻擊行為</li>
              <li><strong>商業濫用</strong>：將服務用於商業目的而未經授權</li>
            </ul>

            <h4>責任聲明</h4>
            <ul>
              <li><strong>服務免費性質</strong>：本服務為免費提供，不保證永久可用</li>
              <li><strong>檔案遺失風險</strong>：系統可能因技術問題導致檔案遺失</li>
              <li><strong>使用風險</strong>：使用者需自行承擔使用服務的風險</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>4. 技術支援與聯絡</h3>

            <h4>服務狀態</h4>
            <ul>
              <li><strong>系統可用性</strong>：目標 99.9% 正常運行時間</li>
              <li><strong>問題回報</strong>：GitHub Issues 回報技術問題</li>
              <li><strong>回應時間</strong>：非緊急問題 24-48 小時內回應</li>
            </ul>

            <h4>版本更新</h4>
            <ul>
              <li><strong>功能更新</strong>：不定期推出新功能與改善</li>
              <li><strong>向下相容</strong>：盡量保持 API 與功能的向後相容</li>
              <li><strong>重大變更</strong>：會提前公告並提供遷移指引</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>5. 資料收集與使用</h3>

            <h4>收集的資料類型</h4>
            <ul>
              <li><strong>上傳檔案</strong>：圖片檔案及其元資料（檔案名稱、大小、類型）</li>
              <li><strong>使用統計</strong>：瀏覽次數、存取時間、來源 IP</li>
              <li><strong>技術資料</strong>：User-Agent、Referer 標頭</li>
            </ul>

            <h4>資料使用目的</h4>
            <ul>
              <li><strong>服務提供</strong>：處理圖片上傳、儲存和分享請求</li>
              <li><strong>安全性維護</strong>：偵測和防止惡意使用</li>
              <li><strong>服務改善</strong>：分析使用模式以優化服務品質</li>
              <li><strong>法律遵循</strong>：遵守法律要求保留必要記錄</li>
            </ul>

            <h4>資料保留期限</h4>
            <ul>
              <li><strong>上傳檔案</strong>：最長 1 個月（可由使用者設定更短期限）</li>
              <li><strong>存取記錄</strong>：6 個月（用於安全分析）</li>
              <li><strong>管理員操作記錄</strong>：永久保留（法律要求）</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>6. Cookie 與追蹤</h3>

            <h4>Cookie 使用</h4>
            <p>本服務使用以下類型的 Cookie：</p>
            <ul>
              <li><strong>必要 Cookie</strong>：用於服務基本功能，無法停用</li>
              <li><strong>分析 Cookie</strong>：用於改善服務品質，可選擇停用</li>
              <li><strong>安全 Cookie</strong>：用於防止惡意使用</li>
            </ul>

            <h4>第三方服務</h4>
            <ul>
              <li><strong>儲存服務</strong>：圖片檔案儲存於 Cloudflare R2</li>
              <li><strong>分析工具</strong>：使用 Vercel Analytics 追蹤基本使用統計</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>7. 使用者權利</h3>

            <h4>資料權利</h4>
            <ul>
              <li><strong>存取權</strong>：可要求存取您的資料</li>
              <li><strong>更正權</strong>：可要求更正不正確的資料</li>
              <li><strong>刪除權</strong>：可要求刪除您的資料</li>
              <li><strong>攜帶權</strong>：可要求以結構化格式取得您的資料</li>
            </ul>

            <h4>限制服務</h4>
            <p>如發現違反使用條款的情況，我們保留以下權利：</p>
            <ul>
              <li>暫時或永久限制服務存取</li>
              <li>刪除違規內容</li>
              <li>保留相關記錄以供法律程序</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>8. 免責聲明</h3>

            <h4>服務可用性</h4>
            <ul>
              <li>本服務按「現狀」提供，不保證無中斷或無錯誤</li>
              <li>我們保留隨時修改或終止服務的權利</li>
              <li>對於服務中斷造成的任何損失，我們不承擔責任</li>
            </ul>

            <h4>內容責任</h4>
            <ul>
              <li>使用者對上傳內容的合法性負完全責任</li>
              <li>我們不對使用者內容進行審查或背書</li>
              <li>發現違法內容時，我們會立即移除並可能報告相關當局</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>9. 聯絡資訊</h3>

            <h4>技術支援</h4>
            <ul>
              <li><strong>問題回報</strong>：透過 service@duk.tw</li>
              <li><strong>回應時間</strong>：工作日 24 小時內回應</li>
              <li><strong>緊急問題</strong>：服務中斷等緊急情況優先處理</li>
            </ul>

            <h4>法律諮詢</h4>
            <p>對於法律相關問題，請諮詢專業律師。本文件不構成法律意見。</p>
          </div>

          <div className={styles.section}>
            <h3>10. 條款修訂</h3>
            <p>我們保留隨時修訂本條款的權利。重大變更將會：</p>
            <ul>
              <li>在網站上公告</li>
              <li>發送通知（如果適用）</li>
              <li>給予合理適應期</li>
            </ul>
            <p>使用服務即表示您同意受最新版本條款約束。</p>
          </div>

          <div className={styles.section}>
            <hr />
            <p><strong>duk.tw 團隊</strong></p>
            <p>最後更新：2025 年 9 月 22 日</p>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.closeButtonFooter} onClick={onClose}>
            我已閱讀並同意
          </button>
        </div>
      </div>
    </div>
  );
}