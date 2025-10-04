import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "圖鴨上床 duk.tw｜免費圖床上傳｜Imgur替代｜Duk圖片上傳",
  description: "圖鴨上床 duk.tw 是台灣開發者打造的免費圖床，支援外連、免登入、生成 Markdown 語法。作為 Imgur 替代方案，提供穩定上傳體驗與極簡設計，讓創作者快速上傳與分享圖片。",
  keywords: "圖鴨上床, duk, duk.tw, 免費圖床, 免費圖片上傳, 圖床, 上傳圖片, Imgur替代, markdown外連, 免費上傳圖片, 圖片外連, Duk圖片上傳",
  openGraph: {
    title: "圖鴨上床 duk.tw｜免費圖床上傳｜Imgur替代｜Duk圖片上傳",
    description: "圖鴨上床 duk.tw 是台灣開發者打造的免費圖床，支援外連、免登入、生成 Markdown 語法。作為 Imgur 替代方案，提供穩定上傳體驗與極簡設計，讓創作者快速上傳與分享圖片。",
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
    title: "圖鴨上床 duk.tw｜免費圖床上傳｜Imgur替代｜Duk圖片上傳",
    description: "圖鴨上床 duk.tw 是台灣開發者打造的免費圖床，支援外連、免登入、生成 Markdown 語法。作為 Imgur 替代方案，提供穩定上傳體驗與極簡設計，讓創作者快速上傳與分享圖片。",
    images: ["https://storage.meteor.today/image/68cff2bdac843e3fb52e87a6.png"],
    creator: "@duk_tw",
  },
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "name": "關於圖鴨上床",
            "description": "台灣開發者打造的極簡免費圖床",
            "mainEntity": {
              "@type": "Organization",
              "name": "圖鴨上床",
              "alternateName": "duk.tw",
              "url": "https://duk.tw",
              "foundingDate": "2024",
              "slogan": "最小的圖床，最大的誠意",
              "logo": "https://duk.tw/logo-imgup.png",
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "contact@duk.tw",
                "contactType": "customer service"
              }
            }
          })
        }}
      />

      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.mainTitle}>圖鴨上床 duk.tw：台灣開發者打造的極簡免費圖床</h1>
          <p className={styles.subtitle}>「最小的圖床，最大的誠意」——這是一個屬於創作者的空間。</p>

          <div className={styles.videoContainer}>
            <iframe 
              src="https://www.youtube.com/embed/-gzC4MXyygg?si=waXzEI-Mzj3qgDdk" 
              title="圖鴨上床品牌介紹影片" 
              allowFullScreen
              className={styles.video}
            />
          </div>

          <section className={styles.section}>
            <h2>品牌價值：什麼是圖鴨上床？為什麼要做一個免費圖床？</h2>
            <p>
              「圖鴨上床」這個名字，聽起來有點可愛，也有點搞笑。
              但它的核心非常單純：<strong>幫你把圖片放上網，讓別人能看到。</strong>
            </p>
            <p>
              很久以前，如果我們要在網路上分享圖片，就必須有一個地方能「放圖」。
              這個地方就叫做「圖床」。
              就像你要睡覺，需要一張床；你要放圖片，也需要一張床。
              所以「圖床」這個詞，其實就是「圖片的家」。
            </p>
            <p>
              但後來，很多圖床變得越來越複雜。
              有的要登入帳號，有的要安裝 App，有的還會塞廣告。
              有時候你只是想上傳一張圖片，卻被迫看十秒鐘的廣告，還要按掉彈窗。
              甚至有的平台，過一段時間就會把你的圖片刪掉，或者封鎖你所在的國家。
            </p>
            <p>
              對於許多創作者來說，這是一件很困擾的事。
              你辛辛苦苦寫了一篇教學文章，貼了好多圖片，但有一天突然全壞掉，變成「圖片失效」。
              你的心血就這樣被吃掉。
              這時你才會發現，「穩定、簡單、免費」的圖床，是多麼重要。
            </p>

            <h3>圖鴨上床的出現：回到最原始的初心</h3>
            <p>
              圖鴨上床 duk.tw，是一位台灣開發者做的免費圖床。
              它的出發點非常樸實：<strong>不為賺錢，不為炫技，只為解決問題。</strong>
              這個問題就是：「我要上傳一張圖片，為什麼這麼難？」
            </p>
            <p>
              所以圖鴨上床選擇了一條最簡單的路。
              打開網站，你只會看到一個按鈕：「選擇圖片」或「拖曳圖片到這裡」。
              不需要登入，沒有註冊，沒有跳出式廣告，也沒有一堆選項讓你眼花撩亂。
              上傳完成後，網站馬上給你一串連結，你可以複製起來，貼到任何地方。
              例如：
            </p>
            <ul>
              <li>你寫部落格，可以貼 Markdown 語法。</li>
              <li>你在論壇留言，可以貼 HTML 語法。</li>
              <li>你在聊天室傳圖，也能直接丟連結。</li>
            </ul>
            <p>
              這就是圖鴨上床的哲學：
              <strong>「少即是多，簡單才是力量。」</strong>
            </p>

            <h3>為什麼圖鴨上床會受到歡迎？</h3>
            <p>有幾個很關鍵的原因：</p>
            <ol>
              <li>
                <strong>它是免費的。</strong>
                你不用付錢，也不用留下個資。對於剛入門的使用者來說，這一點非常重要。
                很多人只是偶爾需要一個圖床，不想被綁定帳號。圖鴨上床就滿足了這樣的需求。
              </li>
              <li>
                <strong>它支援外連。</strong>
                很多免費圖床不讓你外連。也就是說，你上傳了圖片，卻不能貼在其他網站上。
                但圖鴨上床知道，大多數人上傳圖片，是為了在別的地方使用。
                所以它直接提供 Markdown、HTML、原始連結三種格式，幫你省下查找語法的時間。
              </li>
              <li>
                <strong>它穩定、快速。</strong>
                從伺服器到使用者端的設計，圖鴨上床都盡量保持輕量化。
                因此就算你一次上傳多張圖片，速度也不會太慢。
              </li>
              <li>
                <strong>它是台灣本土開發。</strong>
                台灣的使用者在使用國外圖床時，常常會遇到延遲或封鎖。
                圖鴨上床架設在台灣，對本地用戶友善，支援中文介面，體驗更直覺。
              </li>
            </ol>

            <h3>品牌理念：誠意勝過功能</h3>
            <p>
              有人會問：「圖鴨上床的功能好像不多？」
              答案是：沒錯。因為它不追求「多」。
              它追求的是「夠」。
              <strong>夠用、夠快、夠穩定、夠乾淨。</strong>
            </p>
            <p>
              當別的服務在堆疊新功能時，圖鴨上床選擇守住最重要的體驗：
              <em>打開網站 → 上傳 → 拿連結 → 關掉。</em>
              就這樣。
              一個網站，完成該做的事，讓使用者安靜離開，這就是最大的價值。
            </p>

            <h3>「最小的圖床，最大的誠意」是什麼意思？</h3>
            <p>
              這句話是品牌的標語，也是信念。
              「最小」代表它不打擾你、不誇張。
              「最大的誠意」代表它專注於做好一件事——幫你上傳圖片。
            </p>
            <p>
              它像一位默默工作的朋友，不求你記得名字，只希望你能順利完成任務。
              在資訊爆炸、平台充滿追蹤與演算法的時代，
              有一個「不記得你、不偷你資料、也不要求你登入」的網站，本身就是一種溫柔。
            </p>

            <h3>圖鴨上床與使用者的關係</h3>
            <p>
              對於一般人來說，使用圖鴨上床很簡單。
              你不需要學什麼專業術語，也不需要看教學。
              按下「上傳圖片」，拿到連結，貼出去。
              成功。
            </p>
            <p>
              但在這個簡單背後，是開發者長時間對穩定性、隱私、伺服器維運的努力。
              他不是只為自己做一個工具，而是為所有創作者做一個「可依靠的基礎設施」。
              因為在網路的世界裡，能放圖的地方，就是創作能量的起點。
            </p>
            <p>
              所以，當你看到這個網站時，不妨想想：
              「如果這個世界上，還有人願意花時間，為大家做一個乾淨的圖床，這本身是不是很珍貴？」
            </p>
          </section>

          <section className={styles.section}>
            <h2>免費圖床的新標準：以使用者為核心</h2>
            <ul className={styles.featureList}>
              <li><strong>免費上傳圖片</strong>：無需註冊帳號即可開始使用。</li>
              <li><strong>支援外連</strong>：提供 Markdown、HTML 直接引用。</li>
              <li><strong>Imgur替代方案</strong>：繞過封鎖，穩定服務台灣用戶。</li>
              <li><strong>極簡設計</strong>：開啟頁面即上傳，無廣告干擾。</li>
            </ul>
            <p>
              在這個平台上，每一位使用者都是創作者。<br />
              不論是工程師筆記、論壇回覆、或部落格教學，圖鴨上床都提供最純粹的「<strong>上傳 → 外連</strong>」體驗。
            </p>
          </section>

          <section className={styles.section}>
            <h2>媒體觀察與社群熱議</h2>
            <p>
              從{" "}
              <a 
                href="https://tw.news.yahoo.com/%E5%9C%96%E9%B4%A8%E4%B8%8A%E5%BA%8A-duk-tw-%E5%8F%B0%E7%81%A3%E6%9C%AC%E5%9C%9F%E7%86%B1%E9%96%80%E5%9C%96%E5%BA%8A-%E6%88%90%E7%82%BA-052544145.html" 
                target="_blank" 
                rel="noopener"
                className={styles.link}
              >
                Yahoo 新聞報導
              </a>{" "}
              到{" "}
              <a 
                href="https://home.gamer.com.tw/artwork.php?sn=6219377" 
                target="_blank" 
                rel="noopener"
                className={styles.link}
              >
                巴哈姆特創作者專訪
              </a>，
              圖鴨上床的熱度不斷上升。<br />
              網友們在{" "}
              <a 
                href="https://www.dcard.tw/f/talk/p/259884741" 
                target="_blank" 
                rel="noopener nofollow"
                className={styles.link}
              >
                Dcard
              </a>{" "}
              與{" "}
              <a 
                href="https://home.gamer.com.tw/artwork.php?sn=6214023" 
                target="_blank" 
                rel="noopener nofollow"
                className={styles.link}
              >
                個人創作區
              </a>{" "}
              中討論其上傳體驗與品牌哲學，認為它「像早期的網路精神回歸」。
            </p>
            <blockquote className={styles.quote}>
              「我們不需要再忍受滿版廣告與隱私追蹤，只想要一個可以安心上傳圖片的地方。」——使用者留言
            </blockquote>
          </section>

          <section className={styles.section}>
            <h2>延伸閱讀與參考文章</h2>
            <ul className={styles.linkList}>
              <li>
                <a href="https://home.gamer.com.tw/artwork.php?sn=6219377" target="_blank" rel="noopener" className={styles.link}>
                  巴哈姆特：圖鴨上床是什麼？台灣開發者的真誠作品
                </a>
              </li>
              <li>
                <a href="https://tw.news.yahoo.com/%E5%9C%96%E9%B4%A8%E4%B8%8A%E5%BA%8A-duk-tw-%E5%8F%B0%E7%81%A3%E6%9C%AC%E5%9C%9F%E7%86%B1%E9%96%80%E5%9C%96%E5%BA%8A-%E6%88%90%E7%82%BA-052544145.html" target="_blank" rel="noopener" className={styles.link}>
                  Yahoo 新聞：台灣本土熱門圖床崛起
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/watch?v=-gzC4MXyygg" target="_blank" rel="noopener" className={styles.link}>
                  YouTube：圖鴨上床品牌介紹影片
                </a>
              </li>
              <li>
                <a href="https://www.dcard.tw/f/talk/p/259884741" target="_blank" rel="noopener nofollow" className={styles.link}>
                  Dcard：圖鴨上床是什麼？使用心得與討論串
                </a>
              </li>
              <li>
                <a href="https://home.gamer.com.tw/artwork.php?sn=6214023" target="_blank" rel="noopener nofollow" className={styles.link}>
                  巴哈姆特：免費圖床推薦整理
                </a>
              </li>
            </ul>
          </section>

          <section className={styles.contactSection}>
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
          </section>

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
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>&copy; 2025 圖鴨上床 duk.tw — 免費圖床｜Imgur替代｜圖片外連支援｜台灣開發者打造</p>
        </div>
      </footer>
    </div>
  );
}