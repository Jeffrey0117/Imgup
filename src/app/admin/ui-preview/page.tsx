"use client";

import { useState } from "react";
import styles from "./page.module.css";
import DarkSidebarLayout from "./layouts/DarkSidebarLayout";
import LightFullWidthLayout from "./layouts/LightFullWidthLayout";
import GlassmorphismLayout from "./layouts/GlassmorphismLayout";
import MinimalMonochromeLayout from "./layouts/MinimalMonochromeLayout";
import ColorfulCardsLayout from "./layouts/ColorfulCardsLayout";

type LayoutType =
  | "dark-sidebar"
  | "light-fullwidth"
  | "glassmorphism"
  | "minimal-monochrome"
  | "colorful-cards";

const LAYOUTS = [
  {
    id: "dark-sidebar" as LayoutType,
    name: "版型 1：經典深色側邊欄",
    description: "專業企業風格，深色側邊欄 + 卡片式統計",
  },
  {
    id: "light-fullwidth" as LayoutType,
    name: "版型 2：現代亮色全寬",
    description: "清爽現代風格，頂部導航 + 全寬佈局",
  },
  {
    id: "glassmorphism" as LayoutType,
    name: "版型 3：漸層玻璃風",
    description: "時尚科技感，半透明卡片 + 模糊背景",
  },
  {
    id: "minimal-monochrome" as LayoutType,
    name: "版型 4：極簡黑白",
    description: "高級簡約風格，大量留白 + 黑白灰配色",
  },
  {
    id: "colorful-cards" as LayoutType,
    name: "版型 5：繽紛卡片式",
    description: "活潑年輕風格，彩色卡片 + Grid 佈局",
  },
];

export default function UIPreviewPage() {
  const [selectedLayout, setSelectedLayout] =
    useState<LayoutType>("dark-sidebar");

  const renderLayout = () => {
    switch (selectedLayout) {
      case "dark-sidebar":
        return <DarkSidebarLayout />;
      case "light-fullwidth":
        return <LightFullWidthLayout />;
      case "glassmorphism":
        return <GlassmorphismLayout />;
      case "minimal-monochrome":
        return <MinimalMonochromeLayout />;
      case "colorful-cards":
        return <ColorfulCardsLayout />;
      default:
        return <DarkSidebarLayout />;
    }
  };

  return (
    <div className={styles.previewContainer}>
      <div className={styles.controlBar}>
        <div className={styles.controlContent}>
          <h1 className={styles.title}>🎨 Admin UI 版型預覽</h1>
          <div className={styles.selectWrapper}>
            <label htmlFor="layout-select" className={styles.label}>
              選擇版型：
            </label>
            <select
              id="layout-select"
              className={styles.select}
              value={selectedLayout}
              onChange={(e) => setSelectedLayout(e.target.value as LayoutType)}
            >
              {LAYOUTS.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
            <p className={styles.description}>
              {LAYOUTS.find((l) => l.id === selectedLayout)?.description}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.layoutPreview}>{renderLayout()}</div>
    </div>
  );
}
