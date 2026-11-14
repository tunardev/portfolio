import * as stylex from "@stylexjs/stylex";
import { breakpoints, colors, durations, easings, fontSizes, radii, spacing } from "@/styles/tokens.stylex";
import { gameStyles } from "./gameStyles";

type Props = { winPct: number; expected: number; sure: boolean; showExpected: boolean };

export function EvalPanel({ winPct, expected, sure, showExpected }: Props) {
  return (
    <div {...stylex.props(styles.eval)}>
      <div {...stylex.props(styles.bar)}>
        <div {...stylex.props(styles.barFill(`${winPct}%`))} />
      </div>
      <div {...stylex.props(styles.evalText)}>
        <div {...stylex.props(styles.percent)}>{winPct}%</div>
        <div {...stylex.props(gameStyles.caption)}>the model thinks it wins</div>
        {showExpected && expected >= 0 && (
          <div {...stylex.props(gameStyles.caption, styles.expected)}>
            It expects you to play column {expected + 1}.{sure ? " It has an answer ready." : ""}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = stylex.create({
  eval: {
    display: "flex",
    flexDirection: { default: null, [breakpoints.mobile]: "column" },
    flexShrink: 0,
    gap: { default: spacing.md, [breakpoints.mobile]: "10px" },
    inlineSize: { default: "124px", [breakpoints.mobile]: "100%" },
    paddingBlockStart: { default: "44px", [breakpoints.mobile]: 0 },
  },
  bar: {
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
    inlineSize: { default: "8px", [breakpoints.mobile]: "100%" },
    blockSize: { default: "404px", [breakpoints.mobile]: "6px" },
    borderRadius: { default: radii.sm, [breakpoints.mobile]: "3px" },
    backgroundColor: colors.wash,
  },
  barFill: (percent: string) => ({
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: { default: "8px", [breakpoints.mobile]: percent },
    blockSize: { default: percent, [breakpoints.mobile]: "100%" },
    borderRadius: { default: radii.sm, [breakpoints.mobile]: "3px" },
    backgroundColor: colors.red,
    transition: `height ${durations.slow} ${easings.out}, width ${durations.slow} ${easings.out}`,
  }),
  evalText: {
    display: "flex",
    flexDirection: { default: "column", [breakpoints.mobile]: "row" },
    flexWrap: { default: null, [breakpoints.mobile]: "wrap" },
    alignItems: { default: null, [breakpoints.mobile]: "baseline" },
    columnGap: { default: spacing.xs, [breakpoints.mobile]: spacing.md },
    rowGap: { default: spacing.xs, [breakpoints.mobile]: spacing.xxs },
  },
  percent: {
    fontSize: fontSizes.section,
    lineHeight: "28px",
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    color: colors.red,
  },
  expected: {
    flexBasis: { default: null, [breakpoints.mobile]: "100%" },
    paddingBlockStart: { default: spacing.md, [breakpoints.mobile]: 0 },
  },
});
