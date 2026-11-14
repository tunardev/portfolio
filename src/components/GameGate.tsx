"use client";

import * as stylex from "@stylexjs/stylex";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MarkIcon } from "./Mark";
import { ThemeToggle } from "./ThemeToggle";
import { loadNet } from "./game/model";
import { fetchStats, type Stats } from "./game/stats";
import { shared } from "@/styles/shared";
import { colors, durations, easings, radii, sizes } from "@/styles/tokens.stylex";

const PLAY_HASH = "#play";

const FourInARow = dynamic(() => import("./game/FourInARow").then((mod) => mod.FourInARow), { ssr: false });

export function GameGate({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const mark = useRef<HTMLButtonElement>(null);

  const openGame = useCallback(() => {
    setIsOpen(true);
    void loadNet();
    void fetchStats().then((fetched) => fetched && setStats(fetched));
  }, []);

  const closeGame = () => {
    setIsOpen(false);
    mark.current?.focus();
  };

  useEffect(() => {
    const openIfRequested = () => {
      if (window.location.hash === PLAY_HASH) openGame();
    };

    openIfRequested();
    window.addEventListener("hashchange", openIfRequested);
    return () => window.removeEventListener("hashchange", openIfRequested);
  }, [openGame]);

  return (
    <>
      <div {...stylex.props(shared.header)}>
        <h1 {...stylex.props(shared.siteName)}>
          <button
            ref={mark}
            type="button"
            {...stylex.props(styles.mark, isOpen && styles.markPressed)}
            onClick={() => (isOpen ? setIsOpen(false) : openGame())}
            aria-pressed={isOpen}
            aria-label={isOpen ? "Close the game" : "Play four in a row against the model"}
            title={isOpen ? "Back to the page" : "Play"}
          >
            <MarkIcon />
          </button>
          <span>Tunar</span>
        </h1>
        <ThemeToggle />
      </div>
      {isOpen ? <FourInARow onClose={closeGame} stats={stats} onStats={setStats} /> : children}
    </>
  );
}

const styles = stylex.create({
  mark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: sizes.control,
    blockSize: sizes.control,
    borderRadius: radii.md,
    color: colors.ink,
    transform: { default: null, ":hover": "rotate(-8deg) translateY(-1px)" },
    backgroundColor: { default: null, ":hover": colors.wash },
    transition: `transform ${durations.base} ${easings.out}, background-color ${durations.fast} ease`,
  },
  markPressed: {
    transform: "rotate(90deg)",
  },
});
