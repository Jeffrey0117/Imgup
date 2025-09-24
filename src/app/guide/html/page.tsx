import type { Metadata } from "next";
import Link from "next/link";
import Header from "../../components/Header";
import Breadcrumb from "../../components/Breadcrumb";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "HTML 嵌入教學 | 圖鴨上床(duk.tw) - 網頁圖片嵌入指南",
  description: "完整的 HTML img 標籤教學：屬性說明、響應式圖片、SEO 優化等。學習如何在網站中使用 duk.tw 圖床服務。",
  keywords: "HTML 教學, img 標籤, 圖片嵌入, 響應式設計, SEO 優化",
  openGraph: {
    title: "HTML 嵌入教學 | 圖鴨上床(duk.tw) - 網頁圖片嵌入指南",
    description: "完整的 HTML img 標籤教學：屬性說明、響應式圖片、SEO 優化等。",
    url: "https://duk.tw/guide/html",
    siteName: "duk.tw",
    images: [
      {
        url: "https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png",
        width: 1200,
        height: 630,
        alt: "HTML 嵌入教學",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HTML 嵌入教學 | 圖鴨上床(duk.tw) - 網頁圖片嵌入指南",
    description: "完整的 HTML img 標籤教學：屬性說明、響應式圖片、SEO 優化等。",
    images: ["https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png"],
    creator: "@duk_tw",
  },
};

export default function HtmlGuidePage() {
  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        <div className={styles.content}>
          <Breadcrumb items={[
            { label: "首頁", href: "/" },
            { label: "使用指南", href: "/guide" },
            { label: "HTML 嵌入教學", isActive: true }
          ]} />

          <div className={styles.hero}>
            <h1>HTML 嵌入教學</h1>
            <p className={styles.heroDescription}>
              學習如何在網頁中使用 HTML img 標籤嵌入圖片，
              包含進階屬性和最佳實踐。
            </p>
          </div>

          <div className={styles.guideContent}>
            <section className={styles.guideSection}>
              <h2>🏷️ HTML img 標籤基礎</h2>

              <div className={styles.subSection}>
                <h3>基本語法</h3>
                <p>HTML 中插入圖片最基本的標籤是 &lt;img&gt;：</p>
                <pre className={styles.codeBlock}><img src="圖片網址" alt="替代文字" /></pre>
                <p>這是最簡單的形式，但實際使用時我們會加入更多屬性來優化體驗。</p>
              </div>

              <div className={styles.subSection}>
                <h3>duk.tw 自動生成</h3>
                <p>duk.tw 會在上傳完成後自動生成完整的 HTML img 標籤。例如：</p>
                <pre className={styles.codeBlock}><img src="https://duk.tw/AbCdEf.jpg" alt="可愛的橘貓咪" /></pre>
                <p>實際顯示效果：</p>
                <div className={styles.exampleImage}>
                  <img src="https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png" alt="可愛的橘貓咪" />
                </div>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🎯 進階屬性與最佳實踐</h2>

              <div className={styles.subSection}>
                <h3>尺寸控制屬性</h3>
                <p>使用 width 和 height 屬性來控制圖片尺寸：</p>
                <pre className={styles.codeBlock}><img src="https://duk.tw/AbCdEf.jpg" alt="範例圖片"
     width="400" height="300" /></pre>
                <ul>
                  <li><strong>width</strong> - 圖片寬度（像素）</li>
                  <li><strong>height</strong> - 圖片高度（像素）</li>
                  <li>設定尺寸有助於防止頁面重新排版</li>
                  <li>建議使用實際圖片尺寸以保持比例</li>
                </ul>
              </div>

              <div className={styles.subSection}>
                <h3>Loading 屬性</h3>
                <p>控制圖片的載入時機，提升頁面效能：</p>
                <pre className={styles.codeBlock}><img src="https://duk.tw/AbCdEf.jpg" alt="範例圖片"
     loading="lazy" /></pre>
                <ul>
                  <li><strong>loading="lazy"</strong> - 圖片進入視窗時才載入</li>
                  <li><strong>loading="eager"</strong> - 立即載入（預設值）</li>
                  <li>適用於長頁面，可以提升初始載入速度</li>
                </ul>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🔍 SEO 與無障礙優化</h2>

              <div className={styles.subSection}>
                <h3>替代文字（Alt Text）最佳實踐</h3>
                <p>良好的 alt 文字應該：</p>
                <ul>
                  <li>準確描述圖片內容</li>
                  <li>簡潔但資訊完整</li>
                  <li>包含關鍵字但避免關鍵字堆砌</li>
                  <li>考慮語境和用戶需求</li>
                </ul>
              </div>

              <div className={styles.subSection}>
                <h3>Title 屬性</h3>
                <p>title 屬性提供額外的資訊：</p>
                <pre className={styles.codeBlock}><img src="https://duk.tw/AbCdEf.jpg" alt="產品照片"
     title="我們的旗艦產品 - 高品質咖啡機" /></pre>
                <p>滑鼠懸停時會顯示提示，但不影響 SEO。</p>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🚀 效能優化技巧</h2>

              <div className={styles.subSection}>
                <h3>圖片壓縮</h3>
                <p>在上传前進行適當的圖片壓縮：</p>
                <ul>
                  <li>JPG 格式適合照片，壓縮率 70-85%</li>
                  <li>PNG 適合圖標和透明圖片</li>
                  <li>WebP 提供最佳壓縮效果</li>
                  <li>避免不必要的超高解析度</li>
                </ul>
              </div>

              <div className={styles.subSection}>
                <h3>Lazy Loading 實作</h3>
                <p>在長頁面中使用延遲載入：</p>
                <pre className={styles.codeBlock}>&lt;!-- 在可視區域外的圖片 --&gt;
&lt;img src="https://duk.tw/LazyImg.jpg" alt="延遲載入圖片"
     loading="lazy" /&gt;

&lt;!-- 重要的首屏圖片 --&gt;
&lt;img src="https://duk.tw/Important.jpg" alt="重要圖片"
     loading="eager" /&gt;</pre>
              </div>

              <div className={styles.subSection}>
                <h3>CDN 加速</h3>
                <p>duk.tw 已經整合 CDN 加速：</p>
                <ul>
                  <li>全球節點分發</li>
                  <li>自動選擇最近的伺服器</li>
                  <li>HTTPS 加密傳輸</li>
                  <li>快取優化</li>
                </ul>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>📝 實戰範例</h2>

              <div className={styles.subSection}>
                <h3>部落格文章</h3>
                <pre className={styles.codeBlock}><article>
  <h2>咖啡廳推薦</h2>
  <p>這間咖啡廳的環境非常舒適...</p>

  <figure>
    <img src="https://duk.tw/CafePhoto.jpg" alt="咖啡廳內部裝潢"
         width="600" height="400" />
    <figcaption>咖啡廳溫馨的用餐環境</figcaption>
  </figure>

  <p>他們的拿鐵拉花藝術更是出色...</p>

  <img src="https://duk.tw/LatteArt.jpg" alt="精美的拉花藝術"
       width="400" height="300" loading="lazy" />
</article></pre>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🔧 疑難排解</h2>

              <div className={styles.faq}>
                <h3>Q: 圖片不顯示怎麼辦？</h3>
                <p>A: 檢查 src 屬性是否正確，確認網址可以直接在瀏覽器中開啟。也檢查是否有 CORS 或防火牆阻擋。</p>

                <h3>Q: 圖片變形或模糊？</h3>
                <p>A: 確保 width 和 height 屬性與圖片實際比例相符。避免強制拉伸圖片。</p>

                <h3>Q: 載入速度很慢？</h3>
                <p>A: 考慮使用 loading="lazy"，並確保圖片已經過適當壓縮。duk.tw 使用 CDN 加速，但網路環境也會影響速度。</p>

                <h3>Q: SEO 最佳化？</h3>
                <p>A: 使用描述性的 alt 文字，選擇合適的檔案名稱，並確保圖片與內容相關。</p>
              </div>
            </section>
          </div>

          <div className={styles.ctaSection}>
            <h2>準備在網站上嵌入圖片了嗎？</h2>
            <p>現在你已經掌握了完整的 HTML img 標籤使用技巧，
               開始為你的網站增添豐富的視覺內容吧！</p>
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