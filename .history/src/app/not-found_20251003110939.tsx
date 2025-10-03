'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './page.module.css';

export default function NotFound() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // 判斷錯誤類型
  const getErrorInfo = () => {
    if (!mounted) {
      return {
        icon: '🦆',
        title: '找不到這個頁面呱～',
        text: '這個連結可能已失效，或是網址輸入錯誤。'
      };
    }

    // 短網址格式錯誤
    if (/^\/[a-zA-Z0-9]{4,12}(\/.*)?$/.test(pathname)) {
      return {
        icon: '🖼️',
        title: '找不到這張圖片呱～',
        text: '此圖片可能已過期或連結錯誤。圖片預設保存 30 天。'
      };
    }
    
    // 管理後台路徑
    if (pathname?.includes('/admin')) {
      return {
        icon: '🔒',
        title: '無權限訪問',
        text: '此頁面需要管理員權限。請先登入管理後台。'
      };
    }
    
    // 預覽頁面錯誤
    if (pathname?.includes('/p')) {
      return {
        icon: '👀',
        title: '預覽頁面不存在',
        text: '無法找到此預覽頁面，請確認連結是否正確。'
      };
    }
    
    // 預設錯誤
    return {
      icon: '🦆',
      title: '找不到這個頁面呱～',
      text: '這個連結可能已失效，或是網址輸入錯誤。'
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <div className={styles.container}>
      <div className={styles.notFoundWrapper}>
        <div className={styles.notFoundContent}>
          <div className={styles.notFoundIcon}>
            <img 
              src="/logo-imgup.png" 
              alt="圖鴨 Logo" 
              style={{ width: 120, height: 120, opacity: 0.9 }}
            />
          </div>

          <h1 className={styles.notFoundTitle}>
            {errorInfo.title} {errorInfo.icon}
          </h1>
          
          <p className={styles.notFoundText}>
            {errorInfo.text}<br/>
            別擔心，讓我們帶你回到正確的地方！
          </p>

          <div className={styles.notFoundActions}>
            <Link href="/" className={styles.notFoundPrimaryBtn}>
              <span>回到首頁</span>
            </Link>
            <Link href="/guide" className={styles.notFoundSecondaryBtn}>
              <span>使用教學</span>
            </Link>
          </div>

          <div className={styles.notFoundHint}>
            <p>
              💡 小提示：{' '}
              {pathname?.includes('/admin') 
                ? '需要管理員權限才能訪問此頁面' 
                : '確認連結是否完整複製'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
