import type { Metadata } from "next";
import Link from "next/link";
import Header from "../../components/Header";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "關於我們 | 圖鴨上床(duk.tw) - 台灣熱門圖床服務",
  description: "了解 duk.tw 的發展故事、團隊介紹和服務理念。我們致力於為台灣用戶提供穩定、快速且免費的圖片上傳服務。",
  keywords: "關於圖鴨上床, duk.tw 團隊, 圖床服務, 台灣圖床",
  openGraph: {
    title: "關於我們 | 圖鴨上床(duk.tw) - 台灣熱門圖床服務",
    description: "了解 duk.tw 的發展故事、團隊介紹和服務理念。我們致力於為台灣用戶提供穩定、快速且免費的圖片上傳服務。",
    url: "https://duk.tw/about",
    siteName: "duk.tw",
    images: [
      {
        url: "https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png",
        width: 1200,
        height: 630,
        alt: "關於圖鴨上床",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "關於我們 | 圖鴨上床(duk.tw) - 台灣熱門圖床服務",
    description: "了解 duk.tw 的發展故事、團隊介紹和服務理念。我們致力於為台灣用戶提供穩定、快速且免費的圖片上傳服務。",
    images: ["https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png"],
    creator: "@duk_tw",
  },
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.hero}>
            <h1>關於圖鴨上床</h1>
            <p className={styles.heroDescription}>
              我們是台灣第一個專為內容創作者和開發者設計的圖床服務，
              致力於讓圖片上傳和管理變得簡單而高效。
            </p>
          </div>

          <div className={styles.storySection}>
            <div className={styles.storyContent}>
              <h2>我們的起源</h2>
              <p>
                圖鴨上床（duk.tw）誕生於 2024 年，起初只是開發者們在開發過程中遇到圖片上傳需求的解決方案。
                我們發現市面上雖然有許多圖床服務，但大多數都不夠貼近台灣用戶的使用習慣，也不夠重視用戶體驗。
              </p>
              <p>
                於是，我們決定打造一個專屬於台灣用戶的圖床服務。從一開始的簡單想法，
                到現在已經服務了數萬名用戶，我們始終秉持著「簡單、穩定、免費」的服務理念。
              </p>
            </div>
            <div className={styles.storyImage}>
              <div className={styles.placeholderImage}>
                🦆
              </div>
            </div>
          </div>

          <div className={styles.missionSection}>
            <h2>我們的使命</h2>
            <div className={styles.missionGrid}>
              <div className={styles.missionCard}>
                <div className={styles.missionIcon}>🎯</div>
                <h3>簡化圖片管理</h3>
                <p>
                  我們相信圖片上傳應該像呼吸一樣自然。通過直觀的拖曳介面和智能功能，
                  讓每一位用戶都能輕鬆管理自己的圖片資源。
                </p>
              </div>

              <div className={styles.missionCard}>
                <div className={styles.missionIcon}>🚀</div>
                <h3>提升創作效率</h3>
                <p>
                  無論是部落客撰寫文章、開發者編寫文檔，還是設計師分享作品，
                  duk.tw 都能幫助您將注意力集中在創作本身。
                </p>
              </div>

              <div className={styles.missionCard}>
                <div className={styles.missionIcon}>🌏</div>
                <h3>服務台灣用戶</h3>
                <p>
                  我們專為台灣用戶設計，充分考慮本地網路環境和使用習慣。
                  同時提供繁體中文介面和在地化的支援服務。
                </p>
              </div>

              <div className={styles.missionCard}>
                <div className={styles.missionIcon}>💝</div>
                <h3>堅持免費精神</h3>
                <p>
                  我們相信好的工具應該讓更多人用得上。因此我們堅持提供核心功能完全免費，
                  讓每一位創作者都能無負擔地使用我們的服務。
                </p>
              </div>
            </div>
          </div>

          <div className={styles.teamSection}>
            <h2>認識我們的團隊</h2>
            <p className={styles.teamIntro}>
              我們是一個充滿熱情的開發者團隊，由來自台灣各地的技術愛好者組成。
              雖然團隊規模不大，但我們對技術的熱情和對用戶體驗的執著讓我們能夠持續改進服務。
            </p>

            <div className={styles.teamGrid}>
              <div className={styles.teamMember}>
                <div className={styles.memberAvatar}>
                  👨‍💻
                </div>
                <h4>前端開發者</h4>
                <p>專注於用戶介面設計和前端效能優化</p>
              </div>

              <div className={styles.teamMember}>
                <div className={styles.memberAvatar}>
                  👩‍💻
                </div>
                <h4>後端工程師</h4>
                <p>負責系統架構設計和 API 開發維護</p>
              </div>

              <div className={styles.teamMember}>
                <div className={styles.memberAvatar}>
                  🎨
                </div>
                <h4>UI/UX 設計師</h4>
                <p>致力於創造直觀易用的使用者體驗</p>
              </div>

              <div className={styles.teamMember}>
                <div className={styles.memberAvatar}>
                  🛠️
                </div>
                <h4>DevOps 工程師</h4>
                <p>確保服務的穩定性和擴展性</p>
              </div>
            </div>
          </div>

          <div className={styles.roadmapSection}>
            <h2>發展里程碑</h2>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDate}>2024 Q1</div>
                <div className={styles.timelineContent}>
                  <h4>服務上線</h4>
                  <p>圖鴨上床正式上線，提供基本的圖片上傳功能</p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineDate}>2024 Q2</div>
                <div className={styles.timelineContent}>
                  <h4>功能擴展</h4>
                  <p>推出批量上傳、Markdown 自動生成等進階功能</p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineDate}>2024 Q3</div>
                <div className={styles.timelineContent}>
                  <h4>移動端優化</h4>
                  <p>針對手機和平板用戶優化介面和體驗</p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineDate}>2024 Q4</div>
                <div className={styles.timelineContent}>
                  <h4>社群成長</h4>
                  <p>用戶數突破 10,000，社群反饋持續成長</p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineDate}>2025</div>
                <div className={styles.timelineContent}>
                  <h4>持續創新</h4>
                  <p>規劃更多實用功能，提升用戶體驗</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.valuesSection}>
            <h2>我們的價值觀</h2>
            <div className={styles.valuesGrid}>
              <div className={styles.valueItem}>
                <h3>🔓 開放與透明</h3>
                <p>我們相信開放的態度能帶來更好的服務。我們會及時與用戶溝通服務更新和改進計劃。</p>
              </div>

              <div className={styles.valueItem}>
                <h3>👥 以用戶為中心</h3>
                <p>每一個功能設計都從用戶需求出發。我們仔細聆聽用戶反饋，不斷優化產品體驗。</p>
              </div>

              <div className={styles.valueItem}>
                <h3>🚀 持續創新</h3>
                <p>科技日新月異，我們承諾持續學習和創新，為用戶帶來更好的圖片管理體驗。</p>
              </div>

              <div className={styles.valueItem}>
                <h3>🤝 社群合作</h3>
                <p>我們重視與用戶社群的互動。您的建議和回饋是我們前進的動力。</p>
              </div>
            </div>
          </div>

          <div className={styles.contactSection}>
            <h2>聯繫我們</h2>
            <p>
              如果您有任何問題、建議或合作需求，歡迎隨時聯繫我們。
              我們重視每一個用戶的聲音，並致力於提供最好的服務體驗。
            </p>
            <div className={styles.contactOptions}>
              <div className={styles.contactItem}>
                <h4>📧 電子郵件</h4>
                <p>有問題或建議？歡迎寄信給我們</p>
                <a href="mailto:contact@duk.tw" className={styles.contactLink}>
                  contact@duk.tw
                </a>
              </div>

              <div className={styles.contactItem}>
                <h4>🐦 Twitter</h4>
                <p>關注我們的最新動態和更新</p>
                <a href="https://twitter.com/duk_tw" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                  @duk_tw
                </a>
              </div>
            </div>
          </div>

          <div className={styles.ctaSection}>
            <h2>開始使用 duk.tw</h2>
            <p>
              現在就加入我們的用戶大家庭，體驗簡單高效的圖片上傳服務。
              您的創作之旅從這裡開始。
            </p>
            <div className={styles.ctaButtons}>
              <Link href="/" className={styles.primaryButton}>
                立即開始
              </Link>
              <Link href="/guide" className={styles.secondaryButton}>
                查看使用指南
              </Link>
            </div>
          </div>

          <div className={styles.relatedLinks}>
            <h2>了解更多</h2>
            <div className={styles.linkGrid}>
              <Link href="/features" className={styles.relatedLink}>
                <h3>功能特色</h3>
                <p>探索 duk.tw 的強大功能</p>
              </Link>
              <Link href="/use-cases" className={styles.relatedLink}>
                <h3>應用案例</h3>
                <p>看看其他用戶的故事</p>
              </Link>
              <Link href="/guide" className={styles.relatedLink}>
                <h3>使用指南</h3>
                <p>詳細的使用教學</p>
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