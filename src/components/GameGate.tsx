"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MarkIcon } from "./Mark";
import { ThemeToggle } from "./ThemeToggle";
import { loadNet } from "./game/model";
import { fetchStats, type Stats } from "./game/stats";
import styles from "./GameGate.module.css";

const PLAY_HASH = "#play";

const FourInARow = dynamic(() => import("./game/FourInARow").then((mod) => mod.FourInARow), { ssr: false });

export function GameGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const mark = useRef<HTMLButtonElement>(null);

  const openGame = useCallback(() => {
    setOpen(true);
    void loadNet();
    void fetchStats().then((fetched) => fetched && setStats(fetched));
  }, []);

  // the close button unmounts with the game, so focus goes back to the toggle instead of the body
  const closeGame = () => {
    setOpen(false);
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
      <div className="top">
        <h1 className="name">
          <button
            ref={mark}
            type="button"
            className={styles.mark}
            onClick={() => (open ? setOpen(false) : openGame())}
            aria-pressed={open}
            aria-label={open ? "Close the game" : "Play four in a row against the model"}
            title={open ? "Back to the page" : "Play"}
          >
            <MarkIcon />
          </button>
          <span>Tunar</span>
        </h1>
        <ThemeToggle />
      </div>
      {open ? <FourInARow onClose={closeGame} stats={stats} onStats={setStats} /> : children}
    </>
  );
}
