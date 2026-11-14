import * as stylex from "@stylexjs/stylex";
import { breakpoints, colors, durations, easings, fontSizes, lineHeights, spacing } from "@/styles/tokens.stylex";

const enter = stylex.keyframes({
  from: { transform: "translateY(6px)", opacity: 0 },
  to: { transform: "none", opacity: 1 },
});

export const gameStyles = stylex.create({
  game: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xl,
    inlineSize: "100%",
    animationName: enter,
    animationDuration: "360ms",
    animationTimingFunction: easings.out,
  },
  kicker: {
    fontSize: fontSizes.fine,
    lineHeight: lineHeights.fine,
    color: colors.inkSoft,
  },
  title: {
    margin: 0,
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
    fontWeight: 500,
    letterSpacing: "-0.01em",
    textWrap: "balance",
  },
  lede: {
    fontSize: fontSizes.ui,
    lineHeight: lineHeights.ui,
    color: colors.inkSoft,
  },
  ledeStrong: {
    color: colors.ink,
  },
  caption: {
    fontSize: fontSizes.fine,
    lineHeight: lineHeights.fine,
    color: colors.inkSoft,
  },
  actions: {
    display: "flex",
    flexWrap: { default: null, [breakpoints.mobile]: "wrap" },
    alignItems: "center",
    columnGap: spacing.lg,
    rowGap: { default: spacing.lg, [breakpoints.mobile]: "10px" },
    marginBlockStart: spacing.xxs,
  },
  quiet: {
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    color: { default: colors.inkSoft, ":hover": colors.ink },
    transition: `color ${durations.fast} ease`,
  },
});
