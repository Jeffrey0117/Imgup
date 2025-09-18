"use client";

import { useState } from "react";
import styles from "./ExpirySettings.module.css";

interface ExpirySettingsProps {
  onExpiryChange: (expiryDate: Date | null) => void;
}

export default function ExpirySettings({
  onExpiryChange,
}: ExpirySettingsProps) {
  const [selectedOption, setSelectedOption] = useState<string>("never");

  const handleOptionChange = (option: string) => {
    setSelectedOption(option);

    let expiryDate: Date | null = null;
    const now = new Date();

    switch (option) {
      case "5min":
        expiryDate = new Date(now.getTime() + 5 * 60 * 1000);
        break;
      case "10min":
        expiryDate = new Date(now.getTime() + 10 * 60 * 1000);
        break;
      case "30min":
        expiryDate = new Date(now.getTime() + 30 * 60 * 1000);
        break;
      case "1hour":
        expiryDate = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case "1day":
        expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "7weeks":
        expiryDate = new Date(now.getTime() + 7 * 7 * 24 * 60 * 60 * 1000);
        break;
      case "1month":
        expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case "never":
      default:
        expiryDate = null;
        break;
    }

    onExpiryChange(expiryDate);
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>設定過期時間：</label>
      <select
        value={selectedOption}
        onChange={(e) => handleOptionChange(e.target.value)}
        className={styles.select}
      >
        <option value="never">永不過期</option>
        <option value="5min">5分鐘</option>
        <option value="10min">10分鐘</option>
        <option value="30min">30分鐘</option>
        <option value="1hour">1小時</option>
        <option value="1day">1天</option>
        <option value="7weeks">7周</option>
        <option value="1month">一個月</option>
      </select>
    </div>
  );
}
