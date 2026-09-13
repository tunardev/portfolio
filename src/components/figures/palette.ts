import type { ReactNode } from "react";

export const STAGE_W = 680;
export const STAGE_H = 224;

export type Figure = {
  caption: string;
  duration: number;
  pace: number;
  View: (props: { t: number }) => ReactNode;
};

export const INK = "var(--ink)";
export const RED = "var(--red)";
export const SOFT = "var(--ink-soft)";
export const PAPER = "var(--paper)";
export const ink = (a: number) => `color-mix(in srgb, var(--ink) ${Math.round(a * 100)}%, transparent)`;
export const red = (a: number) => `color-mix(in srgb, var(--red) ${Math.round(a * 100)}%, transparent)`;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
