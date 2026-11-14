"use client";

import * as stylex from "@stylexjs/stylex";
import { themeMarker } from "@/styles/markers.stylex";
import { colors, durations, easings, radii, sizes } from "@/styles/tokens.stylex";
import { type Theme, useTheme } from "./useTheme";

const STORAGE_KEY = "theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

export function ThemeToggle() {
  const isDark = useTheme() === "dark";

  return (
    <button
      type="button"
      {...stylex.props(styles.toggle)}
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light" : "Dark"}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" {...stylex.props(styles.icon)}>
        <path
          {...stylex.props(styles.symbol, styles.moon)}
          d="M11.6 2.6a6.6 6.6 0 1 0 3.8 10.9 5.4 5.4 0 0 1-3.8-10.9Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <g {...stylex.props(styles.symbol, styles.sun)} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="9" cy="9" r="3.1" />
          <path d="M9 1.8v1.7M9 14.5v1.7M1.8 9h1.7M14.5 9h1.7M3.9 3.9l1.2 1.2M12.9 12.9l1.2 1.2M3.9 14.1l1.2-1.2M12.9 5.1l1.2-1.2" />
        </g>
      </svg>
    </button>
  );
}

const DARK_SCHEME = "@media (prefers-color-scheme: dark)";
const HIDDEN_MOON = "rotate(60deg) scale(0.6)";
const HIDDEN_SUN = "rotate(-60deg) scale(0.6)";

const styles = stylex.create({
  toggle: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: sizes.control,
    blockSize: sizes.control,
    borderRadius: radii.md,
    transform: { default: null, ":hover": "rotate(-12deg)", ":focus-visible": "rotate(-12deg)" },
    color: { default: colors.inkSoft, ":hover": colors.ink, ":focus-visible": colors.ink },
    backgroundColor: { default: null, ":hover": colors.wash, ":focus-visible": colors.wash },
    transition: `transform ${durations.base} ${easings.out}, background-color ${durations.fast} ease, color ${durations.fast} ease`,
  },
  icon: {
    display: "block",
    overflow: "visible",
  },
  symbol: {
    transformBox: "view-box",
    transformOrigin: "50% 50%",
    transition: `transform ${durations.calm} ${easings.out}, opacity ${durations.base} ease`,
  },
  moon: {
    transform: {
      default: null,
      [stylex.when.ancestor('[data-theme="dark"]', themeMarker)]: HIDDEN_MOON,
      [DARK_SCHEME]: { default: null, [stylex.when.ancestor(':not([data-theme="light"])', themeMarker)]: HIDDEN_MOON },
    },
    opacity: {
      default: null,
      [stylex.when.ancestor('[data-theme="dark"]', themeMarker)]: 0,
      [DARK_SCHEME]: { default: null, [stylex.when.ancestor(':not([data-theme="light"])', themeMarker)]: 0 },
    },
  },
  sun: {
    transform: {
      default: HIDDEN_SUN,
      [stylex.when.ancestor('[data-theme="dark"]', themeMarker)]: "none",
      [DARK_SCHEME]: { default: null, [stylex.when.ancestor(':not([data-theme="light"])', themeMarker)]: "none" },
    },
    opacity: {
      default: 0,
      [stylex.when.ancestor('[data-theme="dark"]', themeMarker)]: 1,
      [DARK_SCHEME]: { default: null, [stylex.when.ancestor(':not([data-theme="light"])', themeMarker)]: 1 },
    },
  },
});
