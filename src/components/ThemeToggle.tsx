"use client";

import { type Theme, useTheme } from "./useTheme";
import styles from "./ThemeToggle.module.css";

const STORAGE_KEY = "theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

export function ThemeToggle() {
  const dark = useTheme() === "dark";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => applyTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light" : "Dark"}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={styles.icon}>
        <path
          className={styles.moon}
          d="M11.6 2.6a6.6 6.6 0 1 0 3.8 10.9 5.4 5.4 0 0 1-3.8-10.9Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <g className={styles.sun} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="9" cy="9" r="3.1" />
          <path d="M9 1.8v1.7M9 14.5v1.7M1.8 9h1.7M14.5 9h1.7M3.9 3.9l1.2 1.2M12.9 12.9l1.2 1.2M3.9 14.1l1.2-1.2M12.9 5.1l1.2-1.2" />
        </g>
      </svg>
    </button>
  );
}
