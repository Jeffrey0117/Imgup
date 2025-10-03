import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: '找不到頁面 - 圖鴨上床 duk.tw',
  description: '此頁面不存在或已被移除',
  robots: 'noindex, nofollow',
};

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.notFoundWrapper}>
        <div className={styles.notFoundContent}>
          <div className={styles.notFoundIcon}>
            <img 
              src="/logo-imgup.png" 
              alt="圖鴨 Logo" 
              style={{ width: 120, height: 120, opacity: 0.8 }}
            />
          </div>

          <h1 className={styles.notFoundTitle}>
            找不到這個頁面呱～ 🦆
          </h1>
          
          <p className={styles.notFoundText}>
            這個連結可能已失效，或是網址輸入錯誤。<br/>
            別擔心，讓我們帶你回到正確的地方！
          </p>

          <div className={styles.notFoundActions}>
            <Link href="/" className={styles.notFoundPrimaryBtn}>
              回到首頁
            </Link>
            <Link href="/guide" className={styles.notFoundSecondaryBtn}>
              使用教學
            </Link>
          </div>

          <div className={styles.notFoundHint}>
            <p>💡 小提示：確認連結是否完整複製</p>
          </div>
        </div>
      </div>
    </div>
  );
}