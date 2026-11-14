import * as stylex from "@stylexjs/stylex";
import { colors, fontSizes, lineHeights, spacing } from "@/styles/tokens.stylex";
import { gameStyles } from "./gameStyles";
import type { Turning } from "./turning";

const CHART_W = 680;
const CHART_H = 100;
const PLOT_H = 96;
const BASELINE = 2;

const MIDLINE_STROKE = `color-mix(in srgb, ${colors.ink} 14%, transparent)`;

type Props = { confidence: number[]; moves: number; turning: Turning; trainedOn: string | null };

const x = (index: number, span: number) => (index / span) * CHART_W;
const y = (value: number) => CHART_H - value * PLOT_H - BASELINE;

export function TurnChart({ confidence, moves, turning, trainedOn }: Props) {
  const span = Math.max(1, confidence.length - 1);

  return (
    <div {...stylex.props(styles.chart)}>
      <div {...stylex.props(gameStyles.caption)}>How sure it was, move by move</div>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} {...stylex.props(styles.chartSvg)} aria-hidden="true">
        <line x1="0" y1={CHART_H / 2} x2={CHART_W} y2={CHART_H / 2} stroke={MIDLINE_STROKE} strokeDasharray="3 5" />
        <path
          d={confidence.map((value, i) => `${i === 0 ? "M" : "L"}${x(i, span)} ${y(value)}`).join(" ")}
          stroke={colors.red}
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
        />
        {turning && <circle cx={x(turning.move, span)} cy={y(confidence[turning.move])} r={5} fill={colors.red} />}
      </svg>
      <div {...stylex.props(styles.axis)}>
        <span>move 1</span>
        <span>move {moves}</span>
      </div>
      <p {...stylex.props(gameStyles.caption, styles.chartNote)}>
        This game goes into the next training run with the others from today. Tomorrow&apos;s model has seen your line.
        {trainedOn ? ` The one you played was trained on ${trainedOn}.` : ""}
      </p>
    </div>
  );
}

const styles = stylex.create({
  chart: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.sm,
    inlineSize: "100%",
  },
  chartSvg: {
    display: "block",
    inlineSize: "100%",
    blockSize: "auto",
  },
  chartNote: {
    paddingBlockStart: spacing.sm,
  },
  axis: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: fontSizes.micro,
    lineHeight: lineHeights.micro,
    color: colors.inkSoft,
  },
});
