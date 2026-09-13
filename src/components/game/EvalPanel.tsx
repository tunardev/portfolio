import type { CSSProperties } from "react";
import styles from "./FourInARow.module.css";

type Props = { winPct: number; expected: number; sure: boolean; showExpected: boolean };

export function EvalPanel({ winPct, expected, sure, showExpected }: Props) {
  return (
    <div className={styles.eval}>
      <div className={styles.bar}>
        <div className={styles.barFill} style={{ "--pct": `${winPct}%` } as CSSProperties} />
      </div>
      <div className={styles.evalText}>
        <div className={styles.pct}>{winPct}%</div>
        <div className={styles.small}>the model thinks it wins</div>
        {showExpected && expected >= 0 && (
          <div className={`${styles.small} ${styles.expected}`}>
            It expects you to play column {expected + 1}.{sure ? " It has an answer ready." : ""}
          </div>
        )}
      </div>
    </div>
  );
}
