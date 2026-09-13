"use client";

import Link from "next/link";
import { Board } from "./Board";
import { Confetti } from "./Confetti";
import { FriendUnavailable } from "./FriendUnavailable";
import { InviteLink } from "./InviteLink";
import { useFriendGame } from "./useFriendGame";
import styles from "./FourInARow.module.css";

export function FriendGame({ id }: { id: string }) {
  const game = useFriendGame(id);
  if (!game.configured) return <FriendUnavailable />;

  return (
    <section className={styles.game} aria-label="Four in a row with a friend">
      {game.copy.iWon && <Confetti key={game.roundKey} />}

      <p className={styles.kicker}>{game.copy.kicker}</p>
      <h2 className={styles.title}>{game.copy.title}</h2>
      {game.waiting && <InviteLink id={id} />}
      <p className={`${styles.lede} ${game.over ? styles.ledeStrong : ""}`}>{game.copy.lede}</p>

      <Board
        board={game.board}
        canPlay={game.canPlay}
        onPlay={game.playMove}
        last={game.last}
        winningLine={game.winningLine}
        over={game.over}
        dim={game.waiting}
      />

      {game.copy.presence && (
        <p className={styles.presence}>
          <span className={styles.dot} data-live={game.joined || undefined} aria-hidden="true" />
          {game.copy.presence}
        </p>
      )}

      <div className={styles.actions}>
        {game.over && (
          <button type="button" className="pill" onClick={game.rematch}>
            Rematch
          </button>
        )}
        <Link href="/#play" className={styles.quiet}>
          play the model instead
        </Link>
        <Link href="/" className={styles.quiet}>
          back to the page
        </Link>
      </div>
    </section>
  );
}
