import { FIRST, SECOND, type Cell } from "./engine";
import type { Stats } from "./stats";
import type { Turning } from "./turning";
import styles from "./FourInARow.module.css";

const MIN_GAMES_TO_BOAST = 20;

type Props = { over: boolean; result: Cell; stats: Stats | null; turning: Turning; onInvite: () => void };

function headline(result: Cell, stats: Stats | null) {
  if (result === FIRST) {
    return `You won.${stats ? ` ${stats.humanWinsToday} people have today, out of ${stats.gamesToday}.` : ""}`;
  }
  if (result === SECOND) return "It won. Most games go this way now.";
  return "A draw. Rare, and fair.";
}

function standing(stats: Stats | null) {
  if (!stats || stats.games < MIN_GAMES_TO_BOAST) {
    return "It plays everyone who visits, and every finished game goes into its next training run.";
  }

  const firstMonth = stats.firstMonthRate
    ? ` In its first month it won ${Math.round(stats.firstMonthRate * 100)}%.`
    : "";

  return `It has played ${stats.games.toLocaleString()} games with visitors and wins ${Math.round(
    stats.modelWinRate * 100,
  )}% of them.${firstMonth}`;
}

export function GameHeader({ over, result, stats, turning, onInvite }: Props) {
  if (over) {
    return (
      <>
        <h2 className={styles.title}>{headline(result, stats)}</h2>
        {turning && (
          <p className={`${styles.lede} ${styles.ledeStrong}`}>
            The game turned at move {turning.move}, in column {turning.column + 1}.{" "}
            {result === FIRST
              ? "It expected a different reply and never recovered."
              : "It saw the line from there and did not let go."}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <h2 className={styles.title}>Play the model. It learns from every game.</h2>
      <p className={styles.lede}>{standing(stats)}</p>
      <button type="button" className={`chevron-link ${styles.friend}`} onClick={onInvite}>
        or play a friend with a link
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M3.5 2 L6.5 5 L3.5 8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </>
  );
}
