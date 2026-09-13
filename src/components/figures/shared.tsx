import type { ReactNode } from "react";
import { SOFT } from "./palette";

export function Label({
  x,
  y,
  color = SOFT,
  anchor = "start",
  children,
}: {
  x: number;
  y: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
  children: ReactNode;
}) {
  return (
    <text x={x} y={y} fontSize={12} fill={color} stroke="none" textAnchor={anchor} dominantBaseline="central">
      {children}
    </text>
  );
}
