"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import styles from "./settings.module.css";

interface SystemSettings {
  // 上傳設定
  uploadApiKey: string;
  maxFileSize: number;
  allowedFormats: string[];

  // Rate Limit 設定
  guestRateLimit: number;
  memberRateLimit: number;
  premiumRateLimit: number;

  // 安全設定
  enableOriginCheck: boolean;
  enableUserAgentCheck: boolean;
  enableFileSignatureCheck: boolean;

  // 儲存設定
  defaultUploadProvider: string;
  enableR2Storage: boolean;
}

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings", {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
      } else {
        toast.error(data.error || "載入設定失敗");
      }
    } catch (error) {
      console.error("載入設定失敗:", error);
      toast.error("載入設定失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      const data = await response.json();

      if (data.success) {
        toast.success("設定已儲存");
      } else {
        toast.error(data.error || "儲存失敗");
      }
    } catch (error) {
      toast.error("儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'duk_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewApiKey(result);
  };

  const applyNewApiKey = async () => {
    if (!newApiKey) {
      toast.error("請先生成 API Key");
      return;
    }

    try {
      const response = await fetch("/api/admin/settings/api-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ apiKey: newApiKey }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success("API Key 已更新");
        setSettings(prev => prev ? { ...prev, uploadApiKey: newApiKey } : null);
        setNewApiKey("");
      } else {
        toast.error(data.error || "更新失敗");
      }
    } catch (error) {
      toast.error("更新失敗");
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>載入中...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={styles.errorContainer}>
        <p>無法載入設定</p>
        <button onClick={loadSettings} className={styles.retryButton}>
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>系統設定</h1>
        <p>管理 API Key、上傳限制與安全設定</p>
      </div>

      {/* API Key 設定 */}
      <section className={styles.section}>
        <h2>API Key 設定</h2>
        <p className={styles.sectionDesc}>
          設定 API Key 後，外部工具需要帶上正確的 Key 才能上傳。本站網頁上傳不受影響。
        </p>

        <div className={styles.apiKeySection}>
          <div className={styles.currentKey}>
            <label>目前 API Key</label>
            <div className={styles.keyDisplay}>
              <input
                type={showApiKey ? "text" : "password"}
                value={settings.uploadApiKey || "(未設定)"}
                readOnly
                className={styles.input}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className={styles.toggleBtn}
              >
                {showApiKey ? "隱藏" : "顯示"}
              </button>
            </div>
          </div>

          <div className={styles.newKey}>
            <label>生成新 API Key</label>
            <div className={styles.keyActions}>
              <input
                type="text"
                value={newApiKey}
                readOnly
                placeholder="點擊生成..."
                className={styles.input}
              />
              <button onClick={generateApiKey} className={styles.generateBtn}>
                生成
              </button>
              <button
                onClick={applyNewApiKey}
                disabled={!newApiKey}
                className={styles.applyBtn}
              >
                套用
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 上傳限制設定 */}
      <section className={styles.section}>
        <h2>上傳限制</h2>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>訪客 - 每分鐘上傳次數</label>
            <input
              type="number"
              value={settings.guestRateLimit}
              onChange={(e) =>
                setSettings({ ...settings, guestRateLimit: parseInt(e.target.value) || 5 })
              }
              className={styles.input}
              min={1}
              max={100}
            />
          </div>

          <div className={styles.formGroup}>
            <label>會員 - 每分鐘上傳次數</label>
            <input
              type="number"
              value={settings.memberRateLimit}
              onChange={(e) =>
                setSettings({ ...settings, memberRateLimit: parseInt(e.target.value) || 20 })
              }
              className={styles.input}
              min={1}
              max={200}
            />
          </div>

          <div className={styles.formGroup}>
            <label>付費會員 - 每分鐘上傳次數</label>
            <input
              type="number"
              value={settings.premiumRateLimit}
              onChange={(e) =>
                setSettings({ ...settings, premiumRateLimit: parseInt(e.target.value) || 60 })
              }
              className={styles.input}
              min={1}
              max={500}
            />
          </div>

          <div className={styles.formGroup}>
            <label>最大檔案大小 (MB)</label>
            <input
              type="number"
              value={settings.maxFileSize / (1024 * 1024)}
              onChange={(e) =>
                setSettings({ ...settings, maxFileSize: (parseInt(e.target.value) || 10) * 1024 * 1024 })
              }
              className={styles.input}
              min={1}
              max={100}
            />
          </div>
        </div>
      </section>

      {/* 安全設定 */}
      <section className={styles.section}>
        <h2>安全設定</h2>

        <div className={styles.toggleGrid}>
          <label className={styles.toggleItem}>
            <input
              type="checkbox"
              checked={settings.enableOriginCheck}
              onChange={(e) =>
                setSettings({ ...settings, enableOriginCheck: e.target.checked })
              }
            />
            <span className={styles.toggleLabel}>
              <strong>Origin 檢查</strong>
              <small>驗證請求來源，防止 CSRF 攻擊</small>
            </span>
          </label>

          <label className={styles.toggleItem}>
            <input
              type="checkbox"
              checked={settings.enableUserAgentCheck}
              onChange={(e) =>
                setSettings({ ...settings, enableUserAgentCheck: e.target.checked })
              }
            />
            <span className={styles.toggleLabel}>
              <strong>User-Agent 檢查</strong>
              <small>封鎖可疑的爬蟲和腳本</small>
            </span>
          </label>

          <label className={styles.toggleItem}>
            <input
              type="checkbox"
              checked={settings.enableFileSignatureCheck}
              onChange={(e) =>
                setSettings({ ...settings, enableFileSignatureCheck: e.target.checked })
              }
            />
            <span className={styles.toggleLabel}>
              <strong>檔案簽名檢查</strong>
              <small>驗證檔案內容是否為真實圖片</small>
            </span>
          </label>
        </div>
      </section>

      {/* 儲存設定 */}
      <section className={styles.section}>
        <h2>儲存設定</h2>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>預設上傳服務</label>
            <select
              value={settings.defaultUploadProvider}
              onChange={(e) =>
                setSettings({ ...settings, defaultUploadProvider: e.target.value })
              }
              className={styles.select}
            >
              <option value="r2">Cloudflare R2 (推薦)</option>
              <option value="urusai">Urusai</option>
              <option value="meteor">Meteor</option>
            </select>
          </div>

          <label className={styles.toggleItem}>
            <input
              type="checkbox"
              checked={settings.enableR2Storage}
              onChange={(e) =>
                setSettings({ ...settings, enableR2Storage: e.target.checked })
              }
            />
            <span className={styles.toggleLabel}>
              <strong>啟用 R2 儲存</strong>
              <small>使用 Cloudflare R2 儲存圖片，速度更快</small>
            </span>
          </label>
        </div>
      </section>

      {/* 儲存按鈕 */}
      <div className={styles.actions}>
        <button onClick={loadSettings} className={styles.cancelBtn}>
          重新載入
        </button>
        <button onClick={handleSave} disabled={saving} className={styles.saveBtn}>
          {saving ? "儲存中..." : "儲存設定"}
        </button>
      </div>
    </div>
  );
}
