import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { shortId } from "@/lib/realtime";
import { shared } from "@/styles/shared";
import { breakpoints, colors, fontSizes, lineHeights, sizes, spacing } from "@/styles/tokens.stylex";
import { Board } from "./Board";
import { Confetti } from "./Confetti";
import { EvalPanel } from "./EvalPanel";
import { GameHeader } from "./GameHeader";
import { TurnChart } from "./TurnChart";
import { FIRST, SECOND, type Cell } from "./engine";
import { gameStyles } from "./gameStyles";
import { useModelGame } from "./useModelGame";
import type { Stats } from "./stats";

type Props = { onClose: () => void; stats: Stats | null; onStats: (stats: Stats) => void };

function outcome(result: Cell) {
  if (result === FIRST) return "You won.";
  if (result === SECOND) return "It won.";
  return "A draw.";
}

export function FourInARow({ onClose, stats, onStats }: Props) {
  const router = useRouter();
  const game = useModelGame(onStats);
  const played = game.moves.length;

  const inviteFriend = () => router.push(`/play/${shortId()}`);
  const announcement = game.over
    ? outcome(game.result)
    : game.humanTurn && game.last
      ? `It played column ${game.last[1] + 1}. Your turn.`
      : "";

  return (
    <section {...stylex.props(gameStyles.game)} aria-label="Four in a row against the model">
      {game.over && game.result === FIRST && <Confetti key={played} />}

      <p {...stylex.props(shared.visuallyHidden)} role="status">
        {announcement}
      </p>
      <p {...stylex.props(gameStyles.kicker)}>
        Four in a row,{" "}
        {game.over ? `${played} moves` : `move ${played + 1}, ${game.humanTurn ? "your turn" : "thinking"}`}
      </p>

      <GameHeader over={game.over} result={game.result} stats={stats} turning={game.turning} onInvite={inviteFriend} />

      <div {...stylex.props(styles.boardRow)}>
        <Board
          board={game.board}
          canPlay={game.humanTurn}
          onPlay={game.play}
          last={game.last}
          winningLine={game.winningLine}
          over={game.over}
        />
        <EvalPanel
          winPct={game.modelWinPct}
          expected={game.expected}
          sure={game.sure}
          showExpected={!game.over && played > 0}
        />
      </div>

      {game.over ? (
        <TurnChart confidence={game.confidence} moves={played} turning={game.turning} trainedOn={game.trainedOn} />
      ) : (
        <p {...stylex.props(styles.help)}>Ink is you, red is the model. Tap a column. The ring is the last move.</p>
      )}

      <div {...stylex.props(gameStyles.actions)}>
        <button type="button" {...stylex.props(shared.pill)} onClick={game.reset} disabled={!game.over && played === 0}>
          {game.over ? "Play again" : "Start over"}
        </button>
        <button type="button" {...stylex.props(gameStyles.quiet)} onClick={onClose}>
          back to the page
        </button>
      </div>
    </section>
  );
}

const styles = stylex.create({
  boardRow: {
    display: "flex",
    flexDirection: { default: null, [breakpoints.mobile]: "column" },
    alignItems: "flex-start",
    gap: { default: sizes.gutter, [breakpoints.mobile]: spacing.lg },
    inlineSize: "100%",
    marginBlockStart: spacing.sm,
  },
  help: {
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    color: colors.inkSoft,
  },
});
