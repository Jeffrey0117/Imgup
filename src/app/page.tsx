"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import Image from "next/image";
import DuckAnimation from "../components/DuckAnimation";
import QRCode from "../components/QRCode";
import ExpirySettings from "../components/ExpirySettings";
import PasswordSettings from "../components/PasswordSettings";
// 移除 generateShortHash，改為使用後端回傳的資料

interface UploadItem {
  id: string;
  file: File;
  done: boolean;
  url: string | null;
  shortUrl?: string;
  progress: number;
  status: "queued" | "uploading" | "success" | "error";
}

export default function Home() {
  // 不再需要 token，因為新的 API 不需要認證
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [markdown, setMarkdown] = useState("");
  const [imgTag, setImgTag] = useState("");
  const [activeTab, setActiveTab] = useState<"markdown" | "html" | "shorturl">(
    "shorturl"
  );
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentUploadUrl, setCurrentUploadUrl] = useState("");
  const [currentShortUrl, setCurrentShortUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [password, setPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  // 批次上傳狀態
  const [batchTotal, setBatchTotal] = useState<number | null>(null);
  const [batchCompleted, setBatchCompleted] = useState(0);
  const [currentItemProgress, setCurrentItemProgress] = useState(0);
  const [activeBatchIds, setActiveBatchIds] = useState<string[]>([]);
  const isBatch = (batchTotal ?? 0) > 1;

  // 依據 queue 自動推導 Markdown 與 HTML，使用短網址並移除 alt
  useEffect(() => {
    const doneItems = queue.filter((q) => q.done && (q.shortUrl || q.url));
    const md = doneItems.map((q) => `![](${q.shortUrl || q.url})`).join("\n");
    const html = doneItems
      .map((q) => `<img src="${q.shortUrl || q.url}" />`)
      .join("\n");
    setMarkdown(md);
    setImgTag(html);
  }, [queue]);

  // 防止背景滾動
  useEffect(() => {
    if (showModal) {
      // 保存原始的 overflow 樣式
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // 禁止滾動
      document.body.style.overflow = "hidden";

      // 清理函數：恢復原始樣式
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showModal]);

  // 整體批次進度：以本次批次的每張「item.progress」加總計算（支援併發）
  useEffect(() => {
    if (!isUploading) return;
    if (!batchTotal || activeBatchIds.length === 0) return;

    const total = activeBatchIds.length * 100;
    const sum = queue
      .filter((q) => activeBatchIds.includes(q.id))
      .reduce((acc, q) => acc + (q.progress ?? 0), 0);

    const overall = Math.min(100, (sum / total) * 100);
    setUploadProgress(overall);
  }, [isUploading, batchTotal, activeBatchIds, queue]);

  // 移除檔案大小限制（因為實際上傳是調用外部 API）
  const addFiles = (files: FileList) => {
    const newItems: UploadItem[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        newItems.push({
          id: crypto.randomUUID(),
          file,
          done: false,
          url: null,
          progress: 0,
          status: "queued",
        });
      }
    });

    setQueue((prev) => [...prev, ...newItems]);
  };

  // 格式化檔案大小顯示
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove("dragover");
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.add("dragover");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove("dragover");
  };

  const uploadFile = async (item: UploadItem): Promise<void> => {
    const formData = new FormData();
    formData.append("image", item.file, item.file.name);

    console.log(
      "開始上傳:",
      item.file.name,
      "大小:",
      formatFileSize(item.file.size)
    );

    let progressInterval: ReturnType<typeof setInterval> | null = null;
    try {
      // 模擬單張上傳進度，配合批次總進度換算
      progressInterval = setInterval(() => {
        setCurrentItemProgress((prev) => {
          if (prev >= 90) return prev;
          return Math.min(90, prev + Math.random() * 15);
        });

        // 同步更新列表中此檔案的進度條
        setQueue((prev) =>
          prev.map((q) => {
            if (q.id !== item.id) return q;
            const next = Math.min(90, (q.progress ?? 0) + Math.random() * 15);
            return { ...q, progress: next };
          })
        );
      }, 200);

      // 使用我們的 API 路由，避免 CORS 問題
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      // 單張完成，補滿至 100
      setCurrentItemProgress(100);

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Response result:", result);

      if (result.result) {
        // 呼叫 API 將映射存到資料庫並取得短網址
        let shortUrl = "";
        let hash = "";

        try {
          const shortenResponse = await fetch("/api/shorten", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: result.result,
              filename: item.file.name,
              expiresAt: expiryDate || null,
              password: password || null,
            }),
          });

          if (shortenResponse.ok) {
            const shortenData = await shortenResponse.json();
            // 使用後端回傳的 shortUrl 和 hash
            shortUrl = shortenData.shortUrl;
            hash = shortenData.hash;
            console.log("成功取得短網址:", {
              shortUrl: shortUrl,
              hash: hash,
            });
          } else {
            console.error("短網址 API 回應錯誤:", await shortenResponse.text());
          }
        } catch (error) {
          console.error("儲存短網址到資料庫失敗:", error);
          // 即使短網址失敗，仍顯示原始網址
        }

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  done: true,
                  url: result.result,
                  shortUrl: shortUrl || undefined,
                  progress: 100,
                  status: "success" as const,
                }
              : q
          )
        );

        // 設定上傳結果並延遲關閉動畫，給 QR Code 足夠時間生成
        setCurrentUploadUrl(result.result);
        // 確保有短網址才設置，否則使用原始網址
        setCurrentShortUrl(shortUrl || "");

        // 累計批次上傳成功數（單張也會累計為 1）
        setBatchCompleted((prev) => prev + 1);
      } else {
        console.log("上傳失敗:", result);
        // 保持 Modal 開啟，由 startUpload 控制狀態
        showToast("上傳失敗，請重試");
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error" as const } : q
          )
        );
      }
    } catch (error) {
      console.error("上傳錯誤:", error);
      // 保持 Modal 開啟，由 startUpload 控制狀態

      // 更友善的錯誤訊息
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          showToast("網路連線錯誤，請檢查網路連線後重試");
        } else {
          showToast(error.message);
        }
      }

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "error" as const } : q
        )
      );
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }
  };

  const startUpload = async () => {
    const pendingItems = queue.filter((item) => !item.done);

    if (pendingItems.length === 0) return;

    // 立即顯示 Modal 和鴨子動畫
    setShowModal(true);
    setIsUploading(true);
    setUploadProgress(0);
    setCurrentUploadUrl("");
    setCurrentShortUrl("");
    // 初始化批次狀態
    setBatchTotal(pendingItems.length);
    setBatchCompleted(0);
    setActiveBatchIds(pendingItems.map((i) => i.id));

    // 受控併發上傳（預設 3）
    const CONCURRENCY_LIMIT = 3;
    let index = 0;

    const items = pendingItems;

    const runNext = async () => {
      const i = index++;
      if (i >= items.length) return;
      const item = items[i];

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "uploading" as const, progress: 0 }
            : q
        )
      );

      // 每張開始前將單張進度歸零，讓整體進度平滑遞增
      setCurrentItemProgress(0);
      await uploadFile(item);
      await runNext();
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY_LIMIT, items.length) },
      () => runNext()
    );
    await Promise.all(workers);

    // 批次完成或單張完成後統一切換狀態
    if (pendingItems.length === 1) {
      // 單張：讓鴨子繼續跑 2 秒，確保 QR Code 完全準備好再切換
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setActiveBatchIds([]);
      }, 2000);
    } else {
      // 批次：完成後直接顯示統計資訊
      setIsUploading(false);
      setUploadProgress(0);
      setActiveBatchIds([]);
    }
  };

  const safeAlt = (name: string) => {
    // 返回空字符串，讓 [] 裡面是空白的
    return "";
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      showToast("Markdown 已複製到剪貼簿");
    } catch (error) {
      console.error("複製失敗:", error);
      showToast("複製失敗，請手動選取文字複製");
    }
  };

  const copyImgTag = async () => {
    try {
      await navigator.clipboard.writeText(imgTag);
      showToast("HTML 標籤已複製到剪貼簿");
    } catch (error) {
      console.error("複製失敗:", error);
      showToast("複製失敗，請手動選取文字複製");
    }
  };

  const copyAllShortUrls = async () => {
    const shortUrls = queue
      .filter((item) => item.shortUrl)
      .map((item) => item.shortUrl)
      .join("\n");

    if (!shortUrls) {
      showToast("沒有短網址可以複製");
      return;
    }

    try {
      await navigator.clipboard.writeText(shortUrls);
      showToast("所有短網址已複製到剪貼簿");
    } catch (error) {
      console.error("複製失敗:", error);
      showToast("複製失敗，請手動選取文字複製");
    }
  };

  const copySingleShortUrl = async (shortUrl: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      showToast("短網址已複製到剪貼簿");
    } catch (error) {
      console.error("複製失敗:", error);
      showToast("複製失敗，請手動選取文字複製");
    }
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000); // 3秒後自動消失
  };

  const clearAll = () => {
    setQueue([]);
    setMarkdown("");
    setImgTag("");
  };

  const removeImage = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAccordionToggle = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.logoSection}>
            <Image
              src="/logo-imgup.png"
              alt="ImgUP Logo"
              className={styles.logo}
              width={60}
              height={60}
              priority
            />
            <h1 className={styles.mainTitle}>圖鴨上床(ImgUP)</h1>
          </div>
          <div className={styles.titleSection}>
            <h2 className={styles.subTitle}>Drop images → Upload → Markdown</h2>
            <h2 className={styles.subTitle}>輕鬆拖曳你的圖，它就上床了。</h2>
          </div>
        </div>

        <div className={styles.main}>
          <div
            ref={dropZoneRef}
            className={styles.drop}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.zone}>
              <div>Drop images here / 或點擊選擇</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>
            <div className={styles.hint}>
              <span className={styles.hintFull}>
                png / jpg / webp… 支援多檔同傳
              </span>
              <span className={styles.hintShort}>多檔上傳</span>
            </div>
          </div>

          <div className={styles.rightPanel}>
            <div className={styles.list}>
              {queue.length === 0 ? (
                <p className={styles.empty}>尚無圖片</p>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className={styles.item}>
                    <img
                      className={styles.thumb}
                      src={URL.createObjectURL(item.file)}
                      alt={item.file.name}
                    />
                    <div className={styles.meta}>
                      <div className={styles.name} title={item.file.name}>
                        {item.file.name}
                      </div>
                      <div className={styles.fileSize}>
                        <span className={styles.fileSizeBadge}>
                          {formatFileSize(item.file.size)}
                        </span>
                      </div>
                      {item.shortUrl && (
                        <div className={styles.shortUrlContainer}>
                          <span className={styles.shortUrlText}>
                            {item.shortUrl}
                          </span>
                        </div>
                      )}
                      <div className={styles.bar}>
                        <span
                          style={{ width: `${item.progress}%` }}
                          className={styles.progress}
                        ></span>
                      </div>
                    </div>
                    <div className={styles.status}>
                      {item.status === "queued" && (
                        <span className={styles.mini}>Queued</span>
                      )}
                      {item.status === "uploading" && (
                        <span className={styles.mini}>Uploading…</span>
                      )}
                      {item.status === "success" && (
                        <span className={styles.ok}>OK</span>
                      )}
                      {item.status === "error" && (
                        <span className={styles.fail}>Failed</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeImage(item.id)}
                      className={styles.deleteBtn}
                      title="刪除圖片"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 過期時間和密碼設定 */}
            <div className={styles.settingsSection}>
              <ExpirySettings onExpiryChange={setExpiryDate} />
              <PasswordSettings onPasswordChange={setPassword} />
            </div>

            <div className={styles.actions}>
              <button
                onClick={startUpload}
                className={styles.primaryUpload}
                disabled={queue.length === 0}
              >
                開始上傳
              </button>
              <button onClick={clearAll} className={styles.secondaryClear}>
                Clear
              </button>
            </div>

            {/* Tab 切換區域 */}
            <div className={styles.tabContainer}>
              <div className={styles.tabHeader}>
                <button
                  className={`${styles.tabButton} ${
                    activeTab === "shorturl" ? styles.activeTab : ""
                  }`}
                  onClick={() => setActiveTab("shorturl")}
                >
                  短網址
                </button>
                <button
                  className={`${styles.tabButton} ${
                    activeTab === "markdown" ? styles.activeTab : ""
                  }`}
                  onClick={() => setActiveTab("markdown")}
                >
                  Markdown
                </button>
                <button
                  className={`${styles.tabButton} ${
                    activeTab === "html" ? styles.activeTab : ""
                  }`}
                  onClick={() => setActiveTab("html")}
                >
                  HTML
                </button>
              </div>

              {/* Tab 內容區域 */}
              <div className={styles.tabContent}>
                {/* 短網址 Tab */}
                {activeTab === "shorturl" && (
                  <>
                    <div className={styles.outputHeader}>
                      <p className={styles.mini}>短網址列表：</p>
                      {queue.some((item) => item.shortUrl) && (
                        <button
                          onClick={copyAllShortUrls}
                          className={styles.copyBtn}
                        >
                          複製全部
                        </button>
                      )}
                    </div>
                    <div className={styles.shortUrlList}>
                      {queue.filter((item) => item.shortUrl).length === 0 ? (
                        <p className={styles.emptyShortUrl}>尚無短網址</p>
                      ) : (
                        queue
                          .filter((item) => item.shortUrl)
                          .map((item) => (
                            <div key={item.id} className={styles.shortUrlItem}>
                              <span className={styles.shortUrlItemText}>
                                {item.shortUrl}
                              </span>
                              <button
                                onClick={() =>
                                  copySingleShortUrl(item.shortUrl!)
                                }
                                className={styles.shortUrlCopyBtn}
                              >
                                複製
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </>
                )}

                {/* Markdown Tab */}
                <div
                  style={{
                    display: activeTab === "markdown" ? "block" : "none",
                  }}
                >
                  <div className={styles.outputHeader}>
                    <p className={styles.mini}>Markdown 輸出：</p>
                    {markdown && (
                      <button onClick={copyMarkdown} className={styles.copyBtn}>
                        複製Markdown
                      </button>
                    )}
                  </div>
                  <textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    className={styles.output}
                    placeholder="完成後會自動列出：&#10;![filename](https://i.imgur.com/xxxxxxx.jpeg)"
                  />
                </div>

                {/* HTML Tab */}
                <div
                  style={{ display: activeTab === "html" ? "block" : "none" }}
                >
                  <div className={styles.outputHeader}>
                    <p className={styles.mini}>HTML 標籤輸出：</p>
                    {imgTag && (
                      <button onClick={copyImgTag} className={styles.copyBtn}>
                        複製
                      </button>
                    )}
                  </div>
                  <textarea
                    value={imgTag}
                    onChange={(e) => setImgTag(e.target.value)}
                    className={styles.output}
                    placeholder={`完成後會自動列出：\n<img src="https://i.imgur.com/xxxxxxx.jpeg" alt="filename" />`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <section className={styles.seoSection}>
        <h1>ImgUP 圖鴨上床-免費圖床工具介紹</h1>

        <div className={styles.accordion}>
          <button
            className={styles.accordionHeader}
            onClick={() => handleAccordionToggle("why")}
          >
            為什麼要用圖床？
          </button>
          <div
            className={`${styles.accordionContent} ${
              openAccordion === "why" ? styles.open : ""
            }`}
          >
            <p>
              圖床（Image
              Hosting）是專門用來存放圖片的網路服務。使用圖床的好處包括：
            </p>
            <ul>
              <li>
                <strong>永不失效：</strong>
                專業圖床服務有更好的穩定性，不像網站文章刪除後圖片就消失
              </li>
              <li>
                <strong>加速載入：</strong>圖床有CDN加速，使用者載入圖片更快
              </li>
              <li>
                <strong>節省空間：</strong>部落格或網站不需要儲存大量圖片檔案
              </li>
              <li>
                <strong>統一管理：</strong>所有圖片集中管理，方便後續維護
              </li>
            </ul>
          </div>

          <button
            className={styles.accordionHeader}
            onClick={() => handleAccordionToggle("markdown")}
          >
            Markdown 插入圖片教學
          </button>
          <div
            className={`${styles.accordionContent} ${
              openAccordion === "markdown" ? styles.open : ""
            }`}
          >
            <p>在 Markdown 文件中插入圖片的語法非常簡單：</p>
            <pre>![替代文字](圖片網址)</pre>
            <p>例如：</p>
            <pre>![我的貓咪](https://i.imgur.com/example.jpg)</pre>
            <p>ImgUP 會自動為你生成正確的 Markdown 語法，你只需要：</p>
            <ol>
              <li>上傳圖片</li>
              <li>複製 Markdown 輸出區域的內容</li>
              <li>貼到你的 Markdown 文件中</li>
            </ol>
          </div>

          <button
            className={styles.accordionHeader}
            onClick={() => handleAccordionToggle("html")}
          >
            HTML 插入圖片語法
          </button>
          <div
            className={`${styles.accordionContent} ${
              openAccordion === "html" ? styles.open : ""
            }`}
          >
            <p>在 HTML 中插入圖片需要使用 &lt;img&gt; 標籤：</p>
            <pre>
              <img src="圖片網址" alt="替代文字" />
            </pre>
            <p>例如：</p>
            <pre>
              <img src="https://i.imgur.com/example.jpg" alt="我的貓咪" />
            </pre>
            <p>ImgUP 會自動生成完整的 HTML 標籤，你只需要：</p>
            <ol>
              <li>上傳圖片到 ImgUP</li>
              <li>複製 HTML 標籤輸出區域的內容</li>
              <li>貼到你的 HTML 文件中</li>
            </ol>
          </div>

          <button
            className={styles.accordionHeader}
            onClick={() => handleAccordionToggle("features")}
          >
            ImgUP 功能與優勢
          </button>
          <div
            className={`${styles.accordionContent} ${
              openAccordion === "features" ? styles.open : ""
            }`}
          >
            <p>ImgUP 是專為部落客、開發者和內容創作者設計的免費圖床工具：</p>
            <ul>
              <li>
                <strong>拖曳上傳：</strong>支援拖曳多張圖片快速上傳
              </li>
              <li>
                <strong>批量處理：</strong>同時上傳多張圖片，節省時間
              </li>
              <li>
                <strong>格式支援：</strong>支援 PNG、JPG、WebP 等常見圖片格式
              </li>
              <li>
                <strong>即時生成：</strong>上傳完成後立即生成 Markdown 和 HTML
                語法
              </li>
              <li>
                <strong>一鍵複製：</strong>點擊按鈕即可複製到剪貼簿
              </li>
              <li>
                <strong>免費使用：</strong>完全免費，無需註冊
              </li>
            </ul>
          </div>

          <button
            className={styles.accordionHeader}
            onClick={() => handleAccordionToggle("faq")}
          >
            常見問題（FAQ）
          </button>
          <div
            className={`${styles.accordionContent} ${
              openAccordion === "faq" ? styles.open : ""
            }`}
          >
            <h4>Q: 上傳的圖片會儲存多久？</h4>
            <p>A: 上傳到 Imgur 的圖片會永久保存，不會過期。</p>

            <h4>Q: 有檔案大小限制嗎？</h4>
            <p>A: 圖片大小取決於您使用的圖床服務限制。</p>

            <h4>Q: 支援哪些圖片格式？</h4>
            <p>A: 支援 PNG、JPG、GIF、WebP 等常見格式。</p>

            <h4>Q: 如何一次上傳多張圖片？</h4>
            <p>
              A: 你可以拖曳多張圖片到上傳區域，或使用檔案選擇器選擇多個檔案。
            </p>

            <h4>Q: 圖片會被壓縮嗎？</h4>
            <p>A: Imgur 會根據檔案大小自動優化，但不會明顯降低畫質。</p>
          </div>
        </div>
      </section>
      <footer className={styles.footer}>© 2025 Powered by UPPER</footer>
      {toast.visible && <div className={styles.toast}>{toast.message}</div>}

      {/* 上傳彈窗 - 立即顯示 */}
      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            // 只有點擊背景時才關閉彈窗
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>
                {isUploading
                  ? "上傳中..."
                  : isBatch
                  ? "批次上傳完成"
                  : "上傳成功！"}
              </h3>
              <button
                className={styles.closeButton}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* 平滑過渡：同時渲染兩個階段，使用不透明度切換 */}
              <div className={styles.modalBodyStage}>
                <div
                  className={`${styles.modalStage} ${
                    isUploading
                      ? styles.modalStageVisible
                      : styles.modalStageHidden
                  }`}
                >
                  <DuckAnimation
                    isUploading={isUploading}
                    progress={uploadProgress}
                  />
                </div>
                <div
                  className={`${styles.modalStage} ${
                    !isUploading
                      ? styles.modalStageVisible
                      : styles.modalStageHidden
                  }`}
                >
                  {!isBatch && (
                    <QRCode
                      value={currentShortUrl || currentUploadUrl}
                      size={120}
                    />
                  )}
                </div>
              </div>

              {/* 批次上傳完成後顯示統計資訊（不顯示 QRCode） */}
              {!isUploading && isBatch && (
                <>
                  <div className={styles.urlContainer}>
                    <label className={styles.urlLabel}>批次上傳完成</label>
                    <div
                      className={styles.urlInput}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      已成功上傳 {batchCompleted} 張圖片
                    </div>
                  </div>
                  <p className={styles.mini} style={{ textAlign: "center" }}>
                    請至短網址分頁查看所有連結
                  </p>
                </>
              )}

              {/* 單張上傳完成：顯示 QRCode 與短網址 */}
              {!isUploading && !isBatch && currentUploadUrl && (
                <>
                  <div className={styles.urlContainer}>
                    <label className={styles.urlLabel}>短網址：</label>
                    <input
                      type="text"
                      value={currentShortUrl || currentUploadUrl}
                      readOnly
                      className={styles.urlInput}
                    />
                  </div>
                </>
              )}

              {!isUploading && !isBatch && currentUploadUrl && (
                <div className={styles.buttonGroup}>
                  <button
                    className={styles.copyButton}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          currentShortUrl || currentUploadUrl
                        );
                        setShowModal(false); // 立即關閉彈窗
                        showToast("短網址已複製到剪貼簿");
                      } catch (error) {
                        console.error("複製失敗:", error);
                        showToast("複製失敗，請手動選取網址複製");
                      }
                    }}
                  >
                    複製短網址
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
