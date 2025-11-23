"use client";

import { useEffect, useRef } from "react";
import styles from "./ImageContextMenu.module.css";

export interface ContextMenuAction {
  label: string;
  onClick: () => void;
}

interface ImageContextMenuProps {
  show: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  actions: ContextMenuAction[];
}

export default function ImageContextMenu({
  show,
  position,
  onClose,
  actions,
}: ImageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding the event listener to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {actions.map((action, index) => (
        <div
          key={index}
          className={styles.menuItem}
          onClick={() => {
            action.onClick();
            onClose();
          }}
        >
          {action.label}
        </div>
      ))}
    </div>
  );
}