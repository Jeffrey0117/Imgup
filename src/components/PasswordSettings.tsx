"use client";

import { useState } from "react";
import styles from "./PasswordSettings.module.css";

interface PasswordSettingsProps {
  onPasswordChange: (password: string) => void;
}

export default function PasswordSettings({
  onPasswordChange,
}: PasswordSettingsProps) {
  const [password, setPassword] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      setPassword("");
      onPasswordChange("");
    } else {
      onPasswordChange(password);
    }
  };

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (isEnabled) {
      onPasswordChange(newPassword);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>密碼保護：</label>
        <div className={styles.toggle}>
          <label className={styles.toggleOption}>
            <input
              type="radio"
              name="passwordToggle"
              checked={!isEnabled}
              onChange={() => handleToggle(false)}
              className={styles.radio}
            />
            <span>關閉</span>
          </label>
          <label className={styles.toggleOption}>
            <input
              type="radio"
              name="passwordToggle"
              checked={isEnabled}
              onChange={() => handleToggle(true)}
              className={styles.radio}
            />
            <span>開啟</span>
          </label>
        </div>
      </div>

      {isEnabled && (
        <div className={styles.passwordInput}>
          <input
            type="password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder="請輸入密碼"
            className={styles.input}
          />
          <div className={styles.hint}>
            設定密碼後，訪問短網址時需要輸入密碼
          </div>
        </div>
      )}
    </div>
  );
}
