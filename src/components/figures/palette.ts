import type { ReactNode } from "react";
import { colors } from "@/styles/tokens.stylex";

export const STAGE_W = 680;
export const STAGE_H = 224;

export type Figure = {
  caption: string;
  duration: number;
  pace: number;
  View: (props: { t: number }) => ReactNode;
};

const translucent = (color: string) => (alpha: number) =>
  `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;

export const ink = translucent(colors.ink);
export const red = translucent(colors.red);
export const paper = translucent(colors.paper);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
