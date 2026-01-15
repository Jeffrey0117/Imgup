import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "使用指南 | 圖鴨上床(duk.tw) - 圖床使用教學",
  description: "詳細的 duk.tw 使用指南：拖曳上傳、批量處理、Markdown/HTML 生成、進階功能等完整教學。讓您快速上手圖床服務。",
  keywords: "圖床教學, 使用指南, 拖曳上傳, 批量上傳, Markdown, HTML",
  openGraph: {
    title: "使用指南 | 圖鴨上床(duk.tw) - 圖床使用教學",
    description: "詳細的 duk.tw 使用指南：拖曳上傳、批量處理、Markdown/HTML 生成、進階功能等完整教學。",
    url: "https://duk.tw/guide",
    siteName: "duk.tw",
    images: [
      {
        url: "https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png",
        width: 1200,
        height: 630,
        alt: "圖鴨上床使用指南",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "使用指南 | 圖鴨上床(duk.tw) - 圖床使用教學",
    description: "詳細的 duk.tw 使用指南：拖曳上傳、批量處理、Markdown/HTML 生成、進階功能等完整教學。",
    images: ["https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png"],
    creator: "@html__cat",
  },
};

export default function GuidePage() {
  return (
    <div className={styles.container}>

      {/* 側邊導航欄 */}
      <aside className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>使用指南</h3>
        <nav>
          <ul className={styles.sidebarNav}>
            <li className={styles.sidebarNavItem}>
              <Link href="/guide" className={`${styles.sidebarNavLink} ${styles.active}`}>
                總覽
              </Link>
            </li>
            <li className={styles.sidebarNavItem}>
              <Link href="/guide/markdown" className={styles.sidebarNavLink}>
                Markdown 語法教學
              </Link>
            </li>
            <li className={styles.sidebarNavItem}>
              <Link href="/guide/html" className={styles.sidebarNavLink}>
                HTML 嵌入教學
              </Link>
            </li>
            <li className={styles.sidebarNavItem}>
              <Link href="/guide/faq" className={styles.sidebarNavLink}>
                常見問題 FAQ
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      <main className={`${styles.main} ${styles.mainWithSidebar}`}>
        <div className={styles.content}>
          <div className={styles.hero}>
            <h1>使用指南</h1>
            <p className={styles.heroDescription}>
              一步步教您如何使用 duk.tw 圖鴨上床，從基本上傳到進階功能，
              讓您快速成為圖床達人。
            </p>
          </div>

          <div className={styles.guideContent}>
            <section className={styles.guideSection}>
              <h2>🚀 快速開始</h2>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h3>開啟 duk.tw 網站</h3>
                  <p>在瀏覽器中輸入 https://duk.tw 或點擊上方「首頁」連結進入主頁面。</p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h3>準備您的圖片</h3>
                  <p>支援的格式：PNG、JPG、JPEG、WebP、GIF。檔案大小建議控制在合理範圍內。</p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h3>上傳圖片</h3>
                  <p>拖曳圖片到上傳區域，或點擊選擇檔案。支援單張和批量上傳。</p>
                </div>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>📤 上傳方式詳解</h2>

              <div className={styles.subSection}>
                <h3>拖曳上傳</h3>
                <p>最簡單的上傳方式：</p>
                <ol>
                  <li>開啟檔案總管或 Finder</li>
                  <li>選取一張或多張圖片</li>
                  <li>直接拖曳到瀏覽器的上傳區域</li>
                  <li>系統會自動開始上傳</li>
                </ol>
              </div>

              <div className={styles.subSection}>
                <h3>點擊選擇</h3>
                <p>傳統的檔案選擇方式：</p>
                <ol>
                  <li>點擊上傳區域的「Drop images here / 或點擊選擇」文字</li>
                  <li>在檔案選擇器中選取圖片</li>
                  <li>支援 Ctrl/Cmd + 點擊來選擇多個檔案</li>
                  <li>點擊「開啟」開始上傳</li>
                </ol>
              </div>

              <div className={styles.subSection}>
                <h3>貼上上傳</h3>
                <p>從剪貼簿直接貼上：</p>
                <ol>
                  <li>複製圖片到剪貼簿（Ctrl+C 或 Cmd+C）</li>
                  <li>在 duk.tw 頁面上貼上（Ctrl+V 或 Cmd+V）</li>
                  <li>系統會自動偵測並開始上傳</li>
                </ol>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>📋 取得連結和程式碼</h2>

              <div className={styles.subSection}>
                <h3>短網址</h3>
                <p>上傳完成後，系統會自動生成短網址：</p>
                <ul>
                  <li>格式：https://duk.tw/xxxxx（其中 xxxxx 是隨機代碼）</li>
                  <li>支援圖片副檔名，如 https://duk.tw/xxxxx.jpg</li>
                  <li>可以直接在瀏覽器中開啟查看圖片</li>
                  <li>點擊「複製」按鈕即可複製到剪貼簿</li>
                </ul>
              </div>

              <div className={styles.subSection}>
                <h3>Markdown 語法</h3>
                <p>適用於部落格、GitHub 等平台：</p>
                <pre>![圖片描述](https://duk.tw/xxxxx.jpg)</pre>
                <p>系統會自動生成完整的 Markdown 語法，您只需要複製貼上即可。</p>
              </div>

              <div className={styles.subSection}>
                <h3>HTML 標籤</h3>
                <p>適用於網站和部落格：</p>
                <pre><img src="https://duk.tw/xxxxx.jpg" alt="圖片描述" /></pre>
                <p>生成完整的 img 標籤，包含適當的 alt 屬性。</p>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>⚙️ 進階功能</h2>

              <div className={styles.subSection}>
                <h3>批量上傳</h3>
                <p>一次處理多張圖片：</p>
                <ul>
                  <li>選擇多個檔案或拖曳多張圖片</li>
                  <li>系統會依序上傳，每張圖片都會生成對應的連結</li>
                  <li>在「短網址」分頁中可以查看所有連結</li>
                  <li>支援「複製全部」功能，一次複製所有短網址</li>
                </ul>
              </div>

              <div className={styles.subSection}>
                <h3>到期時間設定</h3>
                <p>設定圖片的保留期限：</p>
                <ul>
                  <li>在上傳前設定到期時間</li>
                  <li>選擇小時、天或月為單位</li>
                  <li>過期後圖片將自動刪除</li>
                </ul>
              </div>

              <div className={styles.subSection}>
                <h3>密碼保護</h3>
                <p>為圖片設定存取密碼：</p>
                <ul>
                  <li>在上傳前設定密碼</li>
                  <li>訪問者需要輸入正確密碼才能查看圖片</li>
                  <li>提供額外的安全保護</li>
                </ul>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🔧 疑難排解</h2>

              <div className={styles.faq}>
                <h3>Q: 上傳失敗怎麼辦？</h3>
                <p>A: 檢查網路連線、檔案格式和大小。支援的格式包括 PNG、JPG、WebP 等。</p>

                <h3>Q: 圖片載入很慢？</h3>
                <p>A: 我們使用 CDN 加速，但網路環境可能影響載入速度。請稍候片刻或重新整理頁面。</p>

                <h3>Q: 如何刪除已上傳的圖片？</h3>
                <p>A: 目前系統不支援刪除功能。如有特殊需求，請聯絡我們。</p>

                <h3>Q: 有檔案大小限制嗎？</h3>
                <p>A: 雖然沒有嚴格限制，但建議單張圖片不要超過 10MB，以確保上傳效率。</p>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>💡 使用技巧</h2>

              <div className={styles.tips}>
                <div className={styles.tip}>
                  <h4>最佳化圖片品質</h4>
                  <p>在保持畫質的情況下，適度壓縮圖片可以加快載入速度。</p>
                </div>

                <div className={styles.tip}>
                  <h4>批量處理工作流程</h4>
                  <p>對於需要上傳多張圖片的專案，建議一次處理所有圖片，節省時間。</p>
                </div>

                <div className={styles.tip}>
                  <h4>組織您的圖片</h4>
                  <p>為圖片命名有意義的檔案名稱，有助於後續管理和維護。</p>
                </div>

                <div className={styles.tip}>
                  <h4>定期備份重要圖片</h4>
                  <p>雖然我們的服務很穩定，但重要圖片建議定期下載備份。</p>
                </div>
              </div>
            </section>
          </div>

          <div className={styles.ctaSection}>
            <h2>準備好開始使用了嗎？</h2>
            <p>現在您已經掌握了所有必要的使用技巧，可以開始享受便捷的圖片上傳體驗了。</p>
            <div className={styles.ctaButtons}>
              <Link href="/" className={styles.primaryButton}>
                開始上傳圖片
              </Link>
              <Link href="/features" className={styles.secondaryButton}>
                了解更多功能
              </Link>
            </div>
          </div>

          <div className={styles.relatedLinks}>
            <h2>繼續探索</h2>
            <div className={styles.linkGrid}>
              <Link href="/use-cases" className={styles.relatedLink}>
                <h3>應用案例</h3>
                <p>看看其他人如何使用 duk.tw</p>
              </Link>
              <Link href="/features" className={styles.relatedLink}>
                <h3>功能特色</h3>
                <p>深入了解所有功能</p>
              </Link>
              <Link href="/about" className={styles.relatedLink}>
                <h3>關於我們</h3>
                <p>了解 duk.tw 的故事</p>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>&copy; 2025 Powered by UPPER |{" "}
            <Link href="/terms" className={styles.footerLink}>
              使用者條款與隱私權政策
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}