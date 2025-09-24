import type { Metadata } from "next";
import Link from "next/link";
import Header from "../../components/Header";
import Breadcrumb from "../../components/Breadcrumb";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "常見問題 FAQ | 圖鴨上床(duk.tw) - 圖床使用問答",
  description: "duk.tw 圖床服務的完整 FAQ：上傳問題、功能說明、技術支援等。解決你使用圖床時遇到的所有疑問。",
  keywords: "FAQ, 常見問題, 圖床問答, 使用說明, 技術支援",
  openGraph: {
    title: "常見問題 FAQ | 圖鴨上床(duk.tw) - 圖床使用問答",
    description: "duk.tw 圖床服務的完整 FAQ：上傳問題、功能說明、技術支援等。",
    url: "https://duk.tw/guide/faq",
    siteName: "duk.tw",
    images: [
      {
        url: "https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png",
        width: 1200,
        height: 630,
        alt: "常見問題 FAQ",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "常見問題 FAQ | 圖鴨上床(duk.tw) - 圖床使用問答",
    description: "duk.tw 圖床服務的完整 FAQ：上傳問題、功能說明、技術支援等。",
    images: ["https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png"],
    creator: "@duk_tw",
  },
};

export default function FaqGuidePage() {
  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        <div className={styles.content}>
          <Breadcrumb items={[
            { label: "首頁", href: "/" },
            { label: "使用指南", href: "/guide" },
            { label: "常見問題 FAQ", isActive: true }
          ]} />

          <div className={styles.hero}>
            <h1>常見問題 FAQ</h1>
            <p className={styles.heroDescription}>
              找不到解答？這裡有你使用 duk.tw 時可能遇到的所有問題和解答，
              幫助你更快上手圖床服務。
            </p>
          </div>

          <div className={styles.guideContent}>
            <section className={styles.guideSection}>
              <h2>🚀 入門使用問題</h2>

              <div className={styles.faq}>
                <h3>Q: 什麼是圖床？為什麼需要圖床？</h3>
                <p>A: 圖床（Image Hosting）是專門用來儲存和分享圖片的網路服務。傳統方式將圖片直接放在網站空間中會佔用大量頻寬和儲存空間，還可能影響網站載入速度。使用圖床可以將圖片集中管理，並利用 CDN 加速讓圖片載入更快。</p>

                <h3>Q: duk.tw 是免費的嗎？</h3>
                <p>A: 是的！duk.tw 提供完全免費的圖床服務，無需註冊帳號即可使用。不過為了防止濫用，我們可能會對極端大量使用進行限制。</p>

                <h3>Q: 需要註冊帳號才能使用嗎？</h3>
                <p>A: 不需要！duk.tw 採用零註冊設計，你可以直接開啟網站開始上傳圖片。這讓使用體驗更加流暢便捷。</p>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>📤 上傳相關問題</h2>

              <div className={styles.faq}>
                <h3>Q: 一次可以上傳多少張圖片？</h3>
                <p>A: duk.tw 支援批量上傳，你可以一次選擇和上傳多張圖片。系統會自動處理這些圖片，並為每張圖片生成對應的短網址。</p>

                <h3>Q: 有檔案大小限制嗎？</h3>
                <p>A: 雖然我們沒有設定嚴格的檔案大小上限，但建議單張圖片不要超過 10MB。過大的檔案會影響上傳速度，也可能造成瀏覽器的效能問題。</p>

                <h3>Q: 上傳失敗怎麼辦？</h3>
                <p>A: 上傳失敗通常由以下原因造成：<br />
                • 網路連線不穩定<br />
                • 檔案格式不支援<br />
                • 檔案大小過大<br />
                • 瀏覽器相容性問題<br />
                請檢查這些因素後重新嘗試，如果問題持續發生，請聯絡我們。</p>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🔗 連結與格式問題</h2>

              <div className={styles.faq}>
                <h3>Q: 上傳後會得到什麼？</h3>
                <p>A: 上傳完成後你會獲得：<br />
                • <strong>短網址</strong>：如 https://duk.tw/AbCdEf.jpg<br />
                • <strong>Markdown 語法</strong>：![圖片描述](https://duk.tw/AbCdEf.jpg)<br />
                • <strong>HTML 標籤</strong>：<img src="https://duk.tw/AbCdEf.jpg" alt="圖片描述" /></p>

                <h3>Q: 短網址會過期嗎？</h3>
                <p>A: 我們不會主動刪除任何圖片，所有上傳的圖片都會永久保存。當然，如果你有特殊需求，也可以設定到期時間讓圖片自動刪除。</p>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>⚙️ 進階功能問題</h2>

              <div className={styles.faq}>
                <h3>Q: 如何設定圖片到期時間？</h3>
                <p>A: 在上傳前，你可以設定圖片的保留期限。 duk.tw 提供小時、天或月為單位，讓你靈活控制圖片的保存時間。過期後圖片會自動刪除。</p>

                <h3>Q: 支援密碼保護嗎？</h3>
                <p>A: 是的！你可以為上傳的圖片設定存取密碼。訪問者需要輸入正確密碼才能查看圖片內容，這為你的圖片提供了額外的安全保護。</p>
              </div>
            </section>

            <section className={styles.guideSection}>
              <h2>🔒 隱私與安全問題</h2>

              <div className={styles.faq}>
                <h3>Q: 我的圖片安全嗎？</h3>
                <p>A: 我們非常重視用戶隱私和資料安全：<br />
                • 使用 HTTPS 加密傳輸<br />
                • 圖片儲存在可靠的第三方服務<br />
                • 不會追蹤或記錄個人資訊<br />
                • 除非法律要求，否則不會查看圖片內容</p>

                <h3>Q: 會收集我的個人資料嗎？</h3>
                <p>A: 不會！duk.tw 採用零註冊設計，我們不會收集任何個人資料，包括 IP 位址、瀏覽器資訊等。我們只處理你上傳的圖片檔案。</p>
              </div>
            </section>
          </div>

          <div className={styles.ctaSection}>
            <h2>還有其他問題嗎？</h2>
            <p>如果這裡的解答無法解決你的問題，請隨時聯絡我們。
               我們致力於提供最好的圖床服務體驗！</p>
            <div className={styles.ctaButtons}>
              <Link href="/" className={styles.primaryButton}>
                開始使用 duk.tw
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