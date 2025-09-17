"use client";

import { useState, useRef } from "react";
import styles from "./page.module.css";

interface UploadItem {
  id: string;
  file: File;
  done: boolean;
  url: string | null;
  progress: number;
  status: "queued" | "uploading" | "success" | "error";
}

export default function Home() {
  // 不再需要 token，因為新的 API 不需要認證
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [markdown, setMarkdown] = useState("");
  const [imgTag, setImgTag] = useState("");
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

    console.log("開始上傳:", item.file.name);

    try {
      // 使用我們的 API 路由，避免 CORS 問題
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response result:", result);

      if (result.result) {
        setQueue((prev) => {
          const newQueue = prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  done: true,
                  url: result.result,
                  progress: 100,
                  status: "success" as const,
                }
              : q
          );
          // 立即構建 Markdown 和 img 標籤
          const lines = newQueue
            .filter((q) => q.done && q.url)
            .map((q) => `![${safeAlt(q.file.name)}](${q.url})`);
          setMarkdown(lines.join("\n"));

          const imgLines = newQueue
            .filter((q) => q.done && q.url)
            .map((q) => `<img src="${q.url}" alt="${q.file.name}" />`);
          setImgTag(imgLines.join("\n"));
          return newQueue;
        });
      } else {
        console.log("上傳失敗:", result);
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error" as const } : q
          )
        );
      }
    } catch (error) {
      console.error("上傳錯誤:", error);
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "error" as const } : q
        )
      );
    }
  };

  const startUpload = async () => {
    const pendingItems = queue.filter((item) => !item.done);

    for (const item of pendingItems) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "uploading" as const } : q
        )
      );

      await uploadFile(item);
    }

    buildMarkdown();
  };

  const buildMarkdown = () => {
    const lines = queue
      .filter((item) => item.done && item.url)
      .map((item) => `![${safeAlt(item.file.name)}](${item.url})`);

    setMarkdown(lines.join("\n"));

    const imgLines = queue
      .filter((item) => item.done && item.url)
      .map((item) => `<img src="${item.url}" alt="${item.file.name}" />`);

    setImgTag(imgLines.join("\n"));
  };

  const safeAlt = (name: string) => {
    // 返回空字符串，讓 [] 裡面是空白的
    return "";
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    showToast("Markdown 已複製到剪貼簿");
  };

  const copyImgTag = () => {
    navigator.clipboard.writeText(imgTag);
    showToast("HTML 標籤已複製到剪貼簿");
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
    setQueue((prev) => {
      const newQueue = prev.filter((item) => item.id !== id);
      // 更新 Markdown 和 HTML 輸出
      const lines = newQueue
        .filter((item) => item.done && item.url)
        .map((item) => `![${safeAlt(item.file.name)}](${item.url})`);
      setMarkdown(lines.join("\n"));

      const imgLines = newQueue
        .filter((item) => item.done && item.url)
        .map((item) => `<img src="${item.url}" alt="${item.file.name}" />`);
      setImgTag(imgLines.join("\n"));

      return newQueue;
    });
  };

  const handleAccordionToggle = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <h1 className={styles.mainTitle}>圖圖上床(ImgUP)</h1>
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

            <div className={styles.actions}>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={styles.primary}
              >
                選擇圖片
              </button>
              <button onClick={startUpload} className={styles.primary}>
                開始上傳
              </button>
              <button onClick={clearAll} className={styles.primary}>
                Clear
              </button>
            </div>

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

            <div className={styles.outputHeader}>
              <p className={styles.mini}>HTML 標籤輸出：</p>
              {imgTag && (
                <button onClick={copyImgTag} className={styles.copyBtn}>
                  複製HTML
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
      <section className={styles.seoSection}>
        <h1>ImgUP 免費圖床工具介紹</h1>

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
            <p>A: 單張圖片最大支援 10MB。</p>

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
    </div>
  );
}
