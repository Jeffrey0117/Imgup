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

  return (
    <div className={styles.container}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.mainTitle}>ImgUP</h1>
            <h2 className={styles.subTitle}>Drop images → Upload → Markdown</h2>
          </div>
          <div className={styles.token}>
            <button onClick={clearAll} className={styles.clearBtn}>
              Clear
            </button>
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
            <div className={styles.hint}>png / jpg / webp… 支援多檔同傳</div>
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
      {toast.visible && <div className={styles.toast}>{toast.message}</div>}
    </div>
  );
}
