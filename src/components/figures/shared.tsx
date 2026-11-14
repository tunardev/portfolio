import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { breakpoints, colors } from "@/styles/tokens.stylex";

export function Label({
  x,
  y,
  color = colors.inkSoft,
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
    <text
      x={x}
      y={y}
      fill={color}
      stroke="none"
      textAnchor={anchor}
      dominantBaseline="central"
      {...stylex.props(styles.label)}
    >
      {children}
    </text>
  );
}

const styles = stylex.create({
  label: {
    fontSize: { default: "12px", [breakpoints.mobile]: "19px" },
  },
});
