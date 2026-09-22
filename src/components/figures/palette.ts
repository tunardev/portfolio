import type { ReactNode } from "react";

export const STAGE_W = 680;
export const STAGE_H = 224;

export type Figure = {
  caption: string;
  /** length of one loop in units of t */
  duration: number;
  /** wall-clock seconds per unit of t */
  pace: number;
  View: (props: { t: number }) => ReactNode;
};

export const INK = "var(--ink)";
export const RED = "var(--red)";
export const SOFT = "var(--ink-soft)";
export const PAPER = "var(--paper)";

const translucent = (color: string) => (alpha: number) =>
  `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;

export const ink = translucent(INK);
export const red = translucent(RED);
export const paper = translucent(PAPER);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
