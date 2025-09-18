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
      case "1hour":
        expiryDate = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case "1day":
        expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "7days":
        expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
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
      <div className={styles.options}>
        <label className={styles.option}>
          <input
            type="radio"
            name="expiry"
            value="never"
            checked={selectedOption === "never"}
            onChange={() => handleOptionChange("never")}
            className={styles.radio}
          />
          <span>永不過期</span>
        </label>

        <label className={styles.option}>
          <input
            type="radio"
            name="expiry"
            value="1hour"
            checked={selectedOption === "1hour"}
            onChange={() => handleOptionChange("1hour")}
            className={styles.radio}
          />
          <span>1小時</span>
        </label>

        <label className={styles.option}>
          <input
            type="radio"
            name="expiry"
            value="1day"
            checked={selectedOption === "1day"}
            onChange={() => handleOptionChange("1day")}
            className={styles.radio}
          />
          <span>1天</span>
        </label>

        <label className={styles.option}>
          <input
            type="radio"
            name="expiry"
            value="7days"
            checked={selectedOption === "7days"}
            onChange={() => handleOptionChange("7days")}
            className={styles.radio}
          />
          <span>7天</span>
        </label>

        <label className={styles.option}>
          <input
            type="radio"
            name="expiry"
            value="30days"
            checked={selectedOption === "30days"}
            onChange={() => handleOptionChange("30days")}
            className={styles.radio}
          />
          <span>30天</span>
        </label>
      </div>
    </div>
  );
}
