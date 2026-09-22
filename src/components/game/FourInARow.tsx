import { useRouter } from "next/navigation";
import { Board } from "./Board";
import { Confetti } from "./Confetti";
import { EvalPanel } from "./EvalPanel";
import { GameHeader } from "./GameHeader";
import { TurnChart } from "./TurnChart";
import { FIRST, SECOND, type Cell } from "./engine";
import { useModelGame } from "./useModelGame";
import type { Stats } from "./stats";
import { shortId } from "@/lib/realtime";
import styles from "./FourInARow.module.css";

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
    <section className={styles.game} aria-label="Four in a row against the model">
      {game.over && game.result === FIRST && <Confetti key={played} />}

      <p className="visually-hidden" role="status">
        {announcement}
      </p>
      <p className={styles.kicker}>
        Four in a row,{" "}
        {game.over ? `${played} moves` : `move ${played + 1}, ${game.humanTurn ? "your turn" : "thinking"}`}
      </p>

      <GameHeader over={game.over} result={game.result} stats={stats} turning={game.turning} onInvite={inviteFriend} />

      <div className={styles.boardRow}>
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
        <p className={styles.help}>Ink is you, red is the model. Tap a column. The ring is the last move.</p>
      )}

      <div className={styles.actions}>
        <button type="button" className="pill" onClick={game.reset} disabled={!game.over && played === 0}>
          {game.over ? "Play again" : "Start over"}
        </button>
        <button type="button" className={styles.quiet} onClick={onClose}>
          back to the page
        </button>
      </div>
    </section>
  );
}
