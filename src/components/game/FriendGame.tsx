"use client";

import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { shared } from "@/styles/shared";
import { colors, fontSizes, lineHeights, radii } from "@/styles/tokens.stylex";
import { Board } from "./Board";
import { Confetti } from "./Confetti";
import { FriendUnavailable } from "./FriendUnavailable";
import { gameStyles } from "./gameStyles";
import { InviteLink } from "./InviteLink";
import { useFriendGame } from "./useFriendGame";

export function FriendGame({ id }: { id: string }) {
  const game = useFriendGame(id);
  if (!game.configured) return <FriendUnavailable />;

  return (
    <section {...stylex.props(gameStyles.game)} aria-label="Four in a row with a friend">
      {game.copy.iWon && <Confetti key={game.roundKey} />}

      <p {...stylex.props(shared.visuallyHidden)} role="status">
        {game.announcement}
      </p>
      <p {...stylex.props(gameStyles.kicker)}>{game.copy.kicker}</p>
      <h2 {...stylex.props(gameStyles.title)}>{game.copy.title}</h2>
      {game.waiting && <InviteLink id={id} />}
      <p {...stylex.props(gameStyles.lede, game.over && gameStyles.ledeStrong)}>{game.copy.lede}</p>

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
        <p {...stylex.props(styles.presence)}>
          <span {...stylex.props(styles.dot, game.joined && styles.dotLive)} aria-hidden="true" />
          {game.copy.presence}
        </p>
      )}

      <div {...stylex.props(gameStyles.actions)}>
        {game.over && game.canRematch && (
          <button type="button" {...stylex.props(shared.pill)} onClick={game.rematch}>
            Rematch
          </button>
        )}
        <Link href="/#play" {...stylex.props(gameStyles.quiet)}>
          play the model instead
        </Link>
        <Link href="/" {...stylex.props(gameStyles.quiet)}>
          back to the page
        </Link>
      </div>
    </section>
  );
}

const pulse = stylex.keyframes({
  "0%, 100%": { opacity: 0.35 },
  "50%": { opacity: 1 },
});

const styles = stylex.create({
  presence: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    color: colors.inkSoft,
  },
  dot: {
    inlineSize: "8px",
    blockSize: "8px",
    borderRadius: radii.pill,
    backgroundColor: colors.red,
    animationName: pulse,
    animationDuration: "1600ms",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
  dotLive: {
    backgroundColor: colors.ink,
    animationName: "none",
  },
});
