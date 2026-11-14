import * as stylex from "@stylexjs/stylex";

const MOBILE = "@media (max-width: 720px)";

export const breakpoints = stylex.defineConsts({
  mobile: MOBILE,
  wide: "@media (min-width: 1040px)",
});

const INK = "light-dark(#1a1917, #ece9e2)";

export const colors = stylex.defineVars({
  paper: "light-dark(#ffffff, #121110)",
  ink: INK,
  inkSoft: "light-dark(#75726d, #a29e97)",
  inkFaint: "light-dark(#9a968f, #75716b)",
  line: "light-dark(#e5e2dc, #2a2927)",
  wash: "light-dark(#f4f2ed, #1c1b1a)",
  red: "light-dark(#d9472b, #e8593d)",
  underline: `color-mix(in srgb, ${INK} 35%, transparent)`,
  underlineStrong: `color-mix(in srgb, ${INK} 45%, transparent)`,
});

export const tints = stylex.defineVars({
  sage: "light-dark(#dce8d3, #24301f)",
  sky: "light-dark(#d9e4f0, #1f2a36)",
  manila: "light-dark(#eee3bc, #3a3218)",
  blush: "light-dark(#f1dcd8, #3a2622)",
  stone: "light-dark(#e4e3de, #2b2a27)",
  mint: "light-dark(#d4e8e0, #1c312b)",
});

export const fonts = stylex.defineConsts({
  sans: 'var(--font-geist-sans), "Helvetica Neue", Arial, sans-serif',
  serif: 'var(--font-newsreader), "Iowan Old Style", Georgia, serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
});

export const fontSizes = stylex.defineVars({
  micro: "11px",
  fine: "13px",
  small: "14px",
  meta: "15px",
  ui: "16px",
  body: { default: "18px", [MOBILE]: "17px" },
  name: { default: "20px", [MOBILE]: "19px" },
  prose: { default: "20px", [MOBILE]: "19px" },
  section: "24px",
  title: { default: "28px", [MOBILE]: "24px" },
  display: { default: "36px", [MOBILE]: "28px" },
});

export const lineHeights = stylex.defineVars({
  micro: "14px",
  fine: "18px",
  small: "20px",
  meta: "22px",
  ui: "24px",
  body: { default: "28px", [MOBILE]: "26px" },
  name: { default: "28px", [MOBILE]: "26px" },
  prose: { default: "30px", [MOBILE]: "28px" },
  section: "30px",
  title: { default: "36px", [MOBILE]: "30px" },
  display: { default: "42px", [MOBILE]: "34px" },
});

export const spacing = stylex.defineConsts({
  xxs: "4px",
  xs: "6px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  xxl: "24px",
  xxxl: "40px",
});

export const radii = stylex.defineConsts({
  sm: "4px",
  md: "6px",
  lg: "8px",
  pill: "999px",
});

export const easings = stylex.defineConsts({
  out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  settle: "cubic-bezier(0.22, 1, 0.36, 1)",
});

export const durations = stylex.defineConsts({
  fast: "160ms",
  base: "220ms",
  calm: "320ms",
  slow: "600ms",
  draw: "700ms",
});

export const sizes = stylex.defineConsts({
  column: "680px",
  gutter: "24px",
  marginNote: "136px",
  marginGap: "24px",
  control: "24px",
});

export const shadows = stylex.defineConsts({
  spine: "inset 1px 0 0 rgb(255 255 255 / 45%), inset -1px 0 0 rgb(26 25 23 / 12%), 0 1px 2px rgb(26 25 23 / 10%)",
  spineDark: "inset 1px 0 0 rgb(255 255 255 / 18%), 0 1px 2px rgb(26 25 23 / 20%)",
  tipped: "-6px 8px 16px -6px rgb(26 25 23 / 28%)",
});

export const focusRing = stylex.defineVars({
  "--focus-ring-color": INK,
});
