import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "應用案例 | 圖鴨上床(duk.tw) - 實際使用案例分享",
  description: "探索 duk.tw 的實際應用案例：部落客、開發者、設計師等各行各業的用戶如何使用我們的圖床服務提升工作效率。",
  keywords: "圖床應用案例, 部落客圖床, 開發者工具, 設計師圖片管理",
  openGraph: {
    title: "應用案例 | 圖鴨上床(duk.tw) - 實際使用案例分享",
    description: "探索 duk.tw 的實際應用案例：部落客、開發者、設計師等各行各業的用戶如何使用我們的圖床服務提升工作效率。",
    url: "https://duk.tw/use-cases",
    siteName: "duk.tw",
    images: [
      {
        url: "https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png",
        width: 1200,
        height: 630,
        alt: "圖鴨上床應用案例",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "應用案例 | 圖鴨上床(duk.tw) - 實際使用案例分享",
    description: "探索 duk.tw 的實際應用案例：部落客、開發者、設計師等各行各業的用戶如何使用我們的圖床服務提升工作效率。",
    images: ["https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png"],
    creator: "@html__cat",
  },
};

export default function UseCasesPage() {
  return (
    <div className={styles.container}>

      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.hero}>
            <h1>應用案例</h1>
            <p className={styles.heroDescription}>
              看看來自不同領域的創作者和專業人士，如何使用 duk.tw 圖鴨上床
              提升工作效率，簡化圖片管理流程。
            </p>
          </div>

          <div className={styles.caseGrid}>
            <div className={styles.caseCard}>
              <div className={styles.caseHeader}>
                <div className={styles.caseIcon}>📝</div>
                <h3>部落客與內容創作者</h3>
              </div>
              <p className={styles.caseDescription}>
                作為一個熱衷寫作的部落客，我需要頻繁在文章中插入圖片。
                duk.tw 的拖曳上傳和自動生成 Markdown 語法，讓我能夠專注在內容創作上。
              </p>
              <div className={styles.caseDetails}>
                <h4>使用場景：</h4>
                <ul>
                  <li>文章配圖快速上傳</li>
                  <li>Markdown 語法自動生成</li>
                  <li>多篇文章圖片統一管理</li>
                  <li>部落格載入速度優化</li>
                </ul>
                <div className={styles.testimonial}>
                  <p>"從過去需要手動處理圖片，到現在只要拖曳就能完成，讓我省下了大量時間。"</p>
                  <cite>- 小明，科技部落客</cite>
                </div>
              </div>
            </div>

            <div className={styles.caseCard}>
              <div className={styles.caseHeader}>
                <div className={styles.caseIcon}>💻</div>
                <h3>前端開發者</h3>
              </div>
              <p className={styles.caseDescription}>
                在開發過程中，我經常需要在原型設計和文檔中展示圖片。
                duk.tw 提供的短網址和 HTML 標籤生成，讓程式碼整合變得輕而易舉。
              </p>
              <div className={styles.caseDetails}>
                <h4>使用場景：</h4>
                <ul>
                  <li>原型設計圖片展示</li>
                  <li>技術文檔圖片嵌入</li>
                  <li>GitHub README 圖片</li>
                  <li>開發團隊圖片資源共享</li>
                </ul>
                <div className={styles.testimonial}>
                  <p>"duk.tw 的 API 整合非常順暢，讓開發流程更加高效。"</p>
                  <cite>- 小華，前端工程師</cite>
                </div>
              </div>
            </div>

            <div className={styles.caseCard}>
              <div className={styles.caseHeader}>
                <div className={styles.caseIcon}>🎨</div>
                <h3>設計師與創意工作者</h3>
              </div>
              <p className={styles.caseDescription}>
                作為設計師，我需要經常分享作品集和設計稿給客戶。
                duk.tw 的批量上傳功能和安全連結，讓我能夠專業地展示作品。
              </p>
              <div className={styles.caseDetails}>
                <h4>使用場景：</h4>
                <ul>
                  <li>作品集展示</li>
                  <li>設計稿分享</li>
                  <li>客戶提案圖片</li>
                  <li>設計過程記錄</li>
                </ul>
                <div className={styles.testimonial}>
                  <p>"批量上傳功能讓分享設計作品變得如此簡單！"</p>
                  <cite>- 小美，UI/UX 設計師</cite>
                </div>
              </div>
            </div>

            <div className={styles.caseCard}>
              <div className={styles.caseHeader}>
                <div className={styles.caseIcon}>📱</div>
                <h3>社群媒體管理者</h3>
              </div>
              <p className={styles.caseDescription}>
                管理多個社群帳號需要大量的圖片素材。
                duk.tw 讓我能夠快速組織和分享圖片資源，提升內容產出效率。
              </p>
              <div className={styles.caseDetails}>
                <h4>使用場景：</h4>
                <ul>
                  <li>社群貼文圖片</li>
                  <li>圖文內容製作</li>
                  <li>活動素材管理</li>
                  <li>品牌形象圖片</li>
                </ul>
                <div className={styles.testimonial}>
                  <p>"現在發文速度快了 3 倍，duk.tw 是我最好的助手。"</p>
                  <cite>- 小李，社群行銷專員</cite>
                </div>
              </div>
            </div>

            <div className={styles.caseCard}>
              <div className={styles.caseHeader}>
                <div className={styles.caseIcon}>📚</div>
                <h3>教育工作者</h3>
              </div>
              <p className={styles.caseDescription}>
                在線上教學中，需要分享大量的教學圖片和資料。
                duk.tw 提供的穩定連結和快速載入，讓教學過程更加順暢。
              </p>
              <div className={styles.caseDetails}>
                <h4>使用場景：</h4>
                <ul>
                  <li>線上課程圖片</li>
                  <li>教學投影片</li>
                  <li>學生作業展示</li>
                  <li>教育資源分享</li>
                </ul>
                <div className={styles.testimonial}>
                  <p>"學生反應圖片載入速度明顯提升，教學體驗更好。"</p>
                  <cite>- 小王，線上課程講師</cite>
                </div>
              </div>
            </div>

            <div className={styles.caseCard}>
              <div className={styles.caseHeader}>
                <div className={styles.caseIcon}>🛒</div>
                <h3>電商經營者</h3>
              </div>
              <p className={styles.caseDescription}>
                商品圖片是電商的核心資產。
                duk.tw 讓我能夠安全有效地管理商品圖片，提升顧客的購物體驗。
              </p>
              <div className={styles.caseDetails}>
                <h4>使用場景：</h4>
                <ul>
                  <li>商品主圖上傳</li>
                  <li>商品詳情圖片</li>
                  <li>促銷活動圖片</li>
                  <li>客戶評價圖片</li>
                </ul>
                <div className={styles.testimonial}>
                  <p>"商品圖片管理從未如此簡單，銷售轉換率明顯提升。"</p>
                  <cite>- 小陳，電商賣家</cite>
                </div>
              </div>
            </div>

            <div className={styles.caseCard}>
              <div className={styles.caseHeader}>
                <div className={styles.caseIcon}>🎮</div>
                <h3>遊戲開發者</h3>
              </div>
              <p className={styles.caseDescription}>
                遊戲開發過程中需要大量的美術資源和概念圖。
                duk.tw 的批量處理功能讓資源管理變得井然有序。
              </p>
              <div className={styles.caseDetails}>
                <h4>使用場景：</h4>
                <ul>
                  <li>遊戲美術資源</li>
                  <li>概念設計圖</li>
                  <li>UI 介面原型</li>
                  <li>開發團隊分享</li>
                </ul>
                <div className={styles.testimonial}>
                  <p>"開發團隊之間的圖片共享從未如此高效。"</p>
                  <cite>- 小張，獨立遊戲開發者</cite>
                </div>
              </div>
            </div>

            <div className={styles.caseCard}>
              <div className={styles.caseHeader}>
                <div className={styles.caseIcon}>📰</div>
                <h3>新聞工作者</h3>
              </div>
              <p className={styles.caseDescription}>
                新聞採編需要快速上傳和分享圖片。
                duk.tw 讓我能夠在緊迫的截稿時間內快速處理新聞照片。
              </p>
              <div className={styles.caseDetails}>
                <h4>使用場景：</h4>
                <ul>
                  <li>新聞照片上傳</li>
                  <li>現場採訪圖片</li>
                  <li>緊急新聞發布</li>
                  <li>圖片版權管理</li>
                </ul>
                <div className={styles.testimonial}>
                  <p>"在現場就能快速上傳新聞照片，大大提升工作效率。"</p>
                  <cite>- 小林，自由記者</cite>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.statsSection}>
            <h2>duk.tw 使用統計</h2>
            <div className={styles.statsGrid}>
              <div className={styles.stat}>
                <div className={styles.statNumber}>10,000+</div>
                <div className={styles.statLabel}>活躍用戶</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNumber}>500,000+</div>
                <div className={styles.statLabel}>圖片已上傳</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNumber}>99.9%</div>
                <div className={styles.statLabel}>服務可用性</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNumber}>24/7</div>
                <div className={styles.statLabel}>全天候服務</div>
              </div>
            </div>
          </div>

          <div className={styles.ctaSection}>
            <h2>加入我們的用戶大家庭</h2>
            <p>
              無論您是哪個領域的創作者，duk.tw 都能為您提供最佳的圖片管理解決方案。
              立即開始體驗，感受高效圖片管理的魅力。
            </p>
            <div className={styles.ctaButtons}>
              <Link href="/" className={styles.primaryButton}>
                開始使用
              </Link>
              <Link href="/features" className={styles.secondaryButton}>
                了解功能特色
              </Link>
            </div>
          </div>

          <div className={styles.relatedLinks}>
            <h2>繼續探索</h2>
            <div className={styles.linkGrid}>
              <Link href="/guide" className={styles.relatedLink}>
                <h3>使用指南</h3>
                <p>詳細的使用教學和技巧</p>
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