"use client";

import { useSyncExternalStore } from "react";
import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

const listeners = new Set<() => void>();

function readTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

function toggleTheme() {
  const next: Theme = readTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {}
  for (const listener of listeners) listener();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "unknown" as const);
  const dark = theme === "dark";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light" : "Dark"}
      data-theme-state={theme}
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
