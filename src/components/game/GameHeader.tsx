import * as stylex from "@stylexjs/stylex";
import { Chevron } from "@/components/Chevron";
import { chevronLinkMarker } from "@/styles/markers.stylex";
import { shared } from "@/styles/shared";
import { fontSizes, lineHeights } from "@/styles/tokens.stylex";
import { FIRST, SECOND, type Cell } from "./engine";
import { gameStyles } from "./gameStyles";
import type { Stats } from "./stats";
import type { Turning } from "./turning";

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
        <h2 {...stylex.props(gameStyles.title)}>{headline(result, stats)}</h2>
        {turning && (
          <p {...stylex.props(gameStyles.lede, gameStyles.ledeStrong)}>
            The game turned at move {turning.ply}, in column {turning.column + 1}.{" "}
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
      <h2 {...stylex.props(gameStyles.title)}>Play the model. It learns from every game.</h2>
      <p {...stylex.props(gameStyles.lede)}>{standing(stats)}</p>
      <button
        type="button"
        {...stylex.props(shared.chevronLink, chevronLinkMarker, styles.friendLink)}
        onClick={onInvite}
      >
        or play a friend with a link
        <Chevron />
      </button>
    </>
  );
}

const styles = stylex.create({
  friendLink: {
    marginBlockStart: "-6px",
    fontSize: fontSizes.meta,
    lineHeight: lineHeights.meta,
  },
});
