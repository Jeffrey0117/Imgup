import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Markdown 語法教學 | 圖鴨上床(duk.tw) - 圖片嵌入指南",
  description: "詳盡的 Markdown 語法教學：圖片嵌入、格式說明、支援平台等。學習如何在部落格、GitHub、文檔中使用 duk.tw 圖床服務。",
  keywords: "Markdown 教學, 圖片嵌入, 語法指南, GitHub, 部落格, 文檔",
  openGraph: {
    title: "Markdown 語法教學 | 圖鴨上床(duk.tw) - 圖片嵌入指南",
    description: "詳盡的 Markdown 語法教學：圖片嵌入、格式說明、支援平台等。學習如何在部落格、GitHub、文檔中使用 duk.tw 圖床服務。",
    url: "https://duk.tw/guide/markdown",
    siteName: "duk.tw",
    images: [
      {
        url: "https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png",
        width: 1200,
        height: 630,
        alt: "Markdown 語法教學",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Markdown 語法教學 | 圖鴨上床(duk.tw) - 圖片嵌入指南",
    description: "詳盡的 Markdown 語法教學：圖片嵌入、格式說明、支援平台等。",
    images: ["https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png"],
    creator: "@html__cat",
  },
};

export default function MarkdownGuidePage() {
  return (
    <div className={styles.container}>
      {/* 側邊導航欄 */}
      <aside className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>使用指南</h3>
        <nav>
          <ul className={styles.sidebarNav}>
            <li className={styles.sidebarNavItem}>
              <Link href="/guide" className={styles.sidebarNavLink}>
                總覽
              </Link>
            </li>
            <li className={styles.sidebarNavItem}>
              <Link href="/guide/markdown" className={`${styles.sidebarNavLink} ${styles.active}`}>
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
          <Breadcrumb items={[
            { label: "首頁", href: "/" },
            { label: "使用指南", href: "/guide" },
            { label: "Markdown 語法教學", isActive: true }
          ]} />

          <div className={styles.hero}>
            <h1>Markdown 語法教學</h1>
            <p className={styles.heroDescription}>
              學習如何在 Markdown 文件中使用 duk.tw 圖床服務，
              包含完整的語法說明和實用技巧。
            </p>
          </div>

          <div className={styles.guideContent}>
            <section className={styles.guideSection}>
              <h2>📝 Markdown 圖片語法基礎</h2>

              <div className={styles.subSection}>
                <h3>基本語法</h3>
                <p>Markdown 中插入圖片的基本語法非常簡單：</p>
                <pre className={styles.codeBlock}>![替代文字](圖片網址)</pre>
                <p>各部分的含義：</p>
                <ul>
                  <li><strong>!</strong> - 表示這是一個圖片</li>
                  <li><strong>[替代文字]</strong> - 當圖片無法載入時顯示的文字，對 SEO 和無障礙很重要</li>
                  <li><strong>(圖片網址)</strong> - 圖片的完整網址</li>
                </ul>
              </div>

              <div className={styles.subSection}>
                <h3>實例說明</h3>
                <p>假設我們有一張貓咪的照片，上傳到 duk.tw 後獲得的短網址是：</p>
                <pre className={styles.codeBlock}>https://duk.tw/AbCdEf.jpg</pre>
                <p>那麼在 Markdown 中的寫法就是：</p>
                <pre className={styles.codeBlock}>![可愛的橘貓咪](https://duk.tw/AbCdEf.jpg)</pre>
                <p>實際顯示效果：</p>
                <div className={styles.exampleImage}>
                  <img src="https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png" alt="可愛的橘貓咪" />
                </div>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🎯 duk.tw Markdown 整合說明</h2>

              <div className={styles.subSection}>
                <h3>自動生成語法</h3>
                <p>duk.tw 會在上傳完成後自動生成正確的 Markdown 語法。你只需要：</p>
                <ol>
                  <li>將圖片拖曳或選擇上傳到 duk.tw</li>
                  <li>等待上傳完成</li>
                  <li>點擊「Markdown」分頁</li>
                  <li>複製生成的 Markdown 語法</li>
                  <li>貼到你的 Markdown 文件中</li>
                </ol>
              </div>

              <div className={styles.subSection}>
                <h3>批次上傳處理</h3>
                <p>當你上傳多張圖片時，duk.tw 會為每張圖片生成對應的 Markdown 語法：</p>
                <pre className={styles.codeBlock}>![圖片1](https://duk.tw/XyZaBc.jpg)
![圖片2](https://duk.tw/DeFgHi.png)
![圖片3](https://duk.tw/JkLmNo.webp)</pre>
                <p>每行一個圖片語法，讓你的文檔井然有序。</p>
              </div>

              <div className={styles.subSection}>
                <h3>格式支援說明</h3>
                <p>duk.tw 支援多種圖片格式，每種格式都會正確生成對應的 Markdown 語法：</p>
                <ul>
                  <li><strong>JPG/JPEG</strong> - 最常見的圖片格式，適合照片</li>
                  <li><strong>PNG</strong> - 支援透明背景，適合圖標和插圖</li>
                  <li><strong>WebP</strong> - 現代格式，提供更好的壓縮效果</li>
                  <li><strong>GIF</strong> - 支援動畫，適合示範和表情符號</li>
                </ul>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🌐 支援的 Markdown 平台</h2>

              <div className={styles.subSection}>
                <h3>GitHub</h3>
                <p>GitHub 是最廣泛使用 Markdown 的平台之一：</p>
                <ul>
                  <li>README.md 文件</li>
                  <li>Issues 和 Pull Requests</li>
                  <li>Wiki 頁面</li>
                  <li>GitHub Pages 部落格</li>
                </ul>
                <p>duk.tw 生成的 Markdown 語法完美相容於 GitHub。</p>
              </div>

              <div className={styles.subSection}>
                <h3>部落格平台</h3>
                <p>各大部落格平台都支援 Markdown：</p>
                <ul>
                  <li><strong>Medium</strong> - 直接貼上即可</li>
                  <li><strong>Dev.to</strong> - 支援完整 Markdown 語法</li>
                  <li><strong>Hugo</strong> - 靜態網站生成器</li>
                  <li><strong>Jekyll</strong> - GitHub Pages 官方支援</li>
                  <li><strong>Hexo</strong> - 熱門的中文部落格框架</li>
                </ul>
              </div>

              <div className={styles.subSection}>
                <h3>文檔工具</h3>
                <p>專業文檔和筆記工具：</p>
                <ul>
                  <li><strong>Notion</strong> - 支援 Markdown 匯入匯出</li>
                  <li><strong>Obsidian</strong> - 原生支援 Markdown</li>
                  <li><strong>Typora</strong> - Markdown 編輯器</li>
                  <li><strong>VS Code</strong> - 程式碼編輯器，支援 Markdown 預覽</li>
                  <li><strong>文檔系統</strong> - 如 MkDocs、Docusaurus 等</li>
                </ul>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>💡 Markdown 進階技巧</h2>

              <div className={styles.subSection}>
                <h3>圖片大小控制</h3>
                <p>雖然 Markdown 標準語法不支援圖片大小控制，但許多平台提供擴展語法：</p>
                <pre className={styles.codeBlock}>&lt;img src="https://duk.tw/AbCdEf.jpg" width="400" alt="縮小圖片"&gt;</pre>
                <p>建議使用 HTML img 標籤來精確控制圖片尺寸。</p>
              </div>

              <div className={styles.subSection}>
                <h3>替代文字的重要性</h3>
                <p>良好的替代文字（alt text）有以下好處：</p>
                <ul>
                  <li><strong>SEO 優化</strong> - 搜尋引擎可以理解圖片內容</li>
                  <li><strong>無障礙設計</strong> - 螢幕閱讀器可以描述圖片</li>
                  <li><strong>網路問題備援</strong> - 當圖片無法載入時顯示文字</li>
                  <li><strong>語意化</strong> - 讓文檔更具可讀性</li>
                </ul>
              </div>

              <div className={styles.subSection}>
                <h3>圖片命名建議</h3>
                <p>良好的圖片檔案命名習慣：</p>
                <ul>
                  <li>使用英文或數字，避免特殊字元</li>
                  <li>使用描述性名稱，如 <code>product-screenshot-2024.png</code></li>
                  <li>統一命名格式，便於管理</li>
                  <li>考慮檔案大小，適度壓縮</li>
                </ul>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🚀 實戰範例</h2>

              <div className={styles.subSection}>
                <h3>部落格文章</h3>
                <p>在部落格文章中插入圖片的完整範例：</p>
                <pre className={styles.codeBlock}># 我的貓咪日記

今天帶著小橘貓去公園玩耍，真是太可愛了！

![小橘貓在公園玩耍](https://duk.tw/ParkCat.jpg)

牠特別喜歡追逐落葉，看起來非常開心。

![小橘貓追逐落葉](https://duk.tw/ChasingLeaves.jpg)

回家後累壞了，睡得香甜。

![睡覺的小橘貓](https://duk.tw/SleepingCat.jpg)</pre>
              </div>

              <div className={styles.subSection}>
                <h3>技術文檔</h3>
                <p>在技術文檔中使用 duk.tw 的範例：</p>
                <pre className={styles.codeBlock}># API 文檔

## 用戶認證流程

以下是完整的用戶認證流程圖：

![用戶認證流程圖](https://duk.tw/AuthFlow.png)

### 步驟說明

1. 用戶提交登入請求
2. 系統驗證憑證
3. 產生 JWT Token
4. 返回認證成功響應

## 錯誤處理

當認證失敗時會返回以下錯誤：

![認證錯誤響應](https://duk.tw/AuthError.jpg)</pre>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🔧 疑難排解</h2>

              <div className={styles.faq}>
                <h3>Q: 圖片無法正常顯示？</h3>
                <p>A: 請檢查網址是否正確複製，確保沒有多餘的空格。也可以嘗試在瀏覽器中直接開啟圖片網址確認。</p>

                <h3>Q: Markdown 語法不生效？</h3>
                <p>A: 不同平台對 Markdown 的支援程度不同。有些平台需要特定的語法或設定。</p>

                <h3>Q: 圖片載入很慢？</h3>
                <p>A: duk.tw 使用 CDN 加速，但網路環境可能影響載入速度。建議選擇合適的圖片格式和大小。</p>

                <h3>Q: 如何批量處理多張圖片？</h3>
                <p>A: duk.tw 支援批次上傳，會為每張圖片生成對應的 Markdown 語法。你可以在「Markdown」分頁中複製全部語法。</p>
              </div>
            </section>
          </div>

          <div className={styles.ctaSection}>
            <h2>準備開始使用 Markdown 了嗎？</h2>
            <p>現在你已經掌握了完整的 Markdown 圖片嵌入技巧，開始創作精彩的內容吧！</p>
            <div className={styles.ctaButtons}>
              <Link href="/" className={styles.primaryButton}>
                開始上傳圖片
              </Link>
              <Link href="/guide" className={styles.secondaryButton}>
                返回使用指南
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