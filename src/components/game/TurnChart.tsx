import styles from "./FourInARow.module.css";
import type { Turning } from "./turning";

const CHART_W = 680;
const CHART_H = 100;
const PLOT_H = 96;
const BASELINE = 2;

type Props = { confidence: number[]; moves: number; turning: Turning; trainedOn: string | null };

export function TurnChart({ confidence, moves, turning, trainedOn }: Props) {
  const span = Math.max(1, confidence.length - 1);
  const x = (index: number) => (index / span) * CHART_W;
  const y = (value: number) => CHART_H - value * PLOT_H - BASELINE;

  return (
    <div className={styles.chart}>
      <div className={styles.small}>How sure it was, move by move</div>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.chartSvg} aria-hidden="true">
        <line
          x1="0"
          y1={CHART_H / 2}
          x2={CHART_W}
          y2={CHART_H / 2}
          stroke="color-mix(in srgb, var(--ink) 14%, transparent)"
          strokeDasharray="3 5"
        />
        <path
          d={confidence.map((value, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(value)}`).join(" ")}
          stroke="var(--red)"
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
        />
        {turning && <circle cx={x(turning.move)} cy={y(confidence[turning.move])} r={5} fill="var(--red)" />}
      </svg>
      <div className={styles.axis}>
        <span>move 1</span>
        <span>move {moves}</span>
      </div>
      <p className={`${styles.small} ${styles.chartNote}`}>
        This game goes into the next training run with the others from today. Tomorrow&apos;s model has seen your line.
        {trainedOn ? ` The one you played was trained on ${trainedOn}.` : ""}
      </p>
    </div>
  );
}
