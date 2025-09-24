import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "功能特色 | 圖鴨上床(duk.tw) - 專業圖床工具",
  description: "探索 duk.tw 的強大功能特色：拖曳上傳、批量處理、格式支援、即時生成 Markdown/HTML、免費使用等。讓圖片管理變得簡單高效。",
  keywords: "圖床功能, 拖曳上傳, 批量處理, Markdown, HTML, 免費圖床",
  openGraph: {
    title: "功能特色 | 圖鴨上床(duk.tw) - 專業圖床工具",
    description: "探索 duk.tw 的強大功能特色：拖曳上傳、批量處理、格式支援、即時生成 Markdown/HTML、免費使用等。",
    url: "https://duk.tw/features",
    siteName: "duk.tw",
    images: [
      {
        url: "https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png",
        width: 1200,
        height: 630,
        alt: "圖鴨上床功能特色",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "功能特色 | 圖鴨上床(duk.tw) - 專業圖床工具",
    description: "探索 duk.tw 的強大功能特色：拖曳上傳、批量處理、格式支援、即時生成 Markdown/HTML、免費使用等。",
    images: ["https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png"],
    creator: "@duk_tw",
  },
};

export default function FeaturesPage() {
  return (
    <div className={styles.container}>

      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.hero}>
            <h1>功能特色</h1>
            <p className={styles.heroDescription}>
              探索 duk.tw 圖鴨上床的強大功能，讓圖片上傳和管理變得前所未有的簡單與高效。
              無論你是部落客、開發者還是內容創作者，都能找到最適合你的工具。
            </p>
          </div>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🖱️</div>
              <h3>拖曳上傳</h3>
              <p>
                支援拖曳多張圖片快速上傳，只需將圖片拖放到上傳區域即可。
                告別繁瑣的檔案選擇流程，讓上傳變得直觀又順暢。
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📦</div>
              <h3>批量處理</h3>
              <p>
                同時上傳多張圖片，一次處理所有檔案。無論是 5 張還是 50 張圖片，
                我們的系統都能高效處理，為您節省寶貴時間。
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🎨</div>
              <h3>格式支援</h3>
              <p>
                支援多種常見圖片格式：PNG、JPG、JPEG、WebP、GIF 等。
                不論是高畫質照片還是動態圖片，都能完美支援。
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⚡</div>
              <h3>即時生成</h3>
              <p>
                上傳完成後立即生成 Markdown 和 HTML 語法。
                不再需要手動編寫程式碼，一鍵複製即可使用。
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📋</div>
              <h3>一鍵複製</h3>
              <p>
                點擊按鈕即可將生成的程式碼複製到剪貼簿。
                支援批量複製所有圖片的連結，操作簡單直覺。
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🆓</div>
              <h3>完全免費</h3>
              <p>
                100% 免費使用，無需註冊、無隱藏費用。
                專為內容創作者和開發者設計，讓創作更自由。
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔒</div>
              <h3>安全可靠</h3>
              <p>
                使用業界標準的安全措施保護您的圖片。
                所有上傳的圖片都經過驗證，確保檔案安全無虞。
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📱</div>
              <h3>響應式設計</h3>
              <p>
                完美適配桌面和行動裝置。無論在電腦、平板還是手機上，
                都能享受到一致的使用體驗。
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🚀</div>
              <h3>高速 CDN</h3>
              <p>
                全球 CDN 加速網路確保圖片載入速度。
                無論您的讀者身在何處，都能快速看到您的圖片。
              </p>
            </div>
          </div>

          <div className={styles.ctaSection}>
            <h2>立即體驗這些強大功能</h2>
            <p>
              加入數千位已經在使用 duk.tw 的內容創作者，一起體驗最簡單的圖片上傳方式。
            </p>
            <div className={styles.ctaButtons}>
              <Link href="/" className={styles.primaryButton}>
                開始使用
              </Link>
              <Link href="/guide" className={styles.secondaryButton}>
                查看使用指南
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
              <Link href="/about" className={styles.relatedLink}>
                <h3>關於我們</h3>
                <p>了解 duk.tw 的發展歷程</p>
              </Link>
              <Link href="/guide" className={styles.relatedLink}>
                <h3>使用指南</h3>
                <p>詳細的使用教學和技巧</p>
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