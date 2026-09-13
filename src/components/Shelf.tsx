"use client";

import { useState, type MouseEvent } from "react";
import { shelf } from "@/content/shelf";
import { bookPull } from "@/lib/sounds";
import styles from "./Shelf.module.css";

const SHELF_LINE = 240;
const LEAN_DEG = 8;
const LEAN_TAN = Math.tan((LEAN_DEG * Math.PI) / 180);
const GAP = 6;
const BOOKEND = { width: 10, height: 114 };
const CASCADE_MS = 22;
const REACH_ABOVE = 12;

const lefts = shelf.reduce<number[]>((acc, _, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + shelf[i - 1].width + GAP);
  return acc;
}, []);

const shelfRight = lefts[shelf.length - 1] + shelf[shelf.length - 1].width;
const bookendLeft = Math.round(shelfRight + BOOKEND.height * LEAN_TAN);
const tallest = Math.max(...shelf.map((paper) => paper.height));

export function Shelf() {
  const [pushed, setPushed] = useState<number | null>(null);

  const tilted = (index: number) => pushed !== null && index >= pushed;

  const track = (event: MouseEvent<HTMLDivElement>) => {
    const stage = event.currentTarget;
    const rect = stage.getBoundingClientRect();
    const scale = rect.width / stage.offsetWidth;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    if (y < SHELF_LINE - tallest - REACH_ABOVE || y > SHELF_LINE) {
      setPushed(null);
      return;
    }

    for (let i = 0; i < shelf.length; i++) {
      const lean = tilted(i) ? (SHELF_LINE - y) * LEAN_TAN : 0;
      const left = lefts[i] + lean;
      if (x >= left && x <= left + shelf[i].width && y >= SHELF_LINE - shelf[i].height) {
        setPushed(i);
        return;
      }
    }
  };

  return (
    <figure className={styles.shelf}>
      <div className={styles.stage}>
        <div className={styles.inner} onMouseMove={track} onMouseLeave={() => setPushed(null)}>
          <div
            className={styles.bookend}
            aria-hidden="true"
            style={{
              left: bookendLeft,
              top: SHELF_LINE - BOOKEND.height,
              width: BOOKEND.width,
              height: BOOKEND.height,
            }}
          >
            <span
              className={styles.bookendBase}
              style={{ left: shelfRight - bookendLeft, width: bookendLeft + BOOKEND.width - shelfRight }}
            />
          </div>

          {shelf.map((paper, i) => {
            const active = pushed === i;
            const tipped = paper.leaning ? !active : tilted(i);
            const delay = pushed !== null && i > pushed ? (i - pushed) * CASCADE_MS : 0;

            return (
              <a
                key={paper.title}
                href={paper.href}
                target="_blank"
                rel="noreferrer"
                className={styles.book}
                data-active={active || undefined}
                data-tipped={tipped || undefined}
                data-cover={paper.darkCover ? "dark" : "light"}
                onFocus={() => setPushed(i)}
                onBlur={() => setPushed(null)}
                onClick={() => bookPull(i)}
                style={{
                  left: lefts[i],
                  top: SHELF_LINE - paper.height,
                  width: paper.width,
                  height: paper.height,
                  background: paper.face,
                  color: paper.ink,
                  transform: tipped ? `rotate(${LEAN_DEG}deg)` : undefined,
                  transitionDelay: delay ? `${delay}ms` : undefined,
                }}
              >
                <span className={styles.title}>{paper.title}</span>
                <span className={styles.year}>{paper.year}</span>
              </a>
            );
          })}

          <div className={styles.line} />
          <div className={styles.shadow} />
        </div>
      </div>

      <figcaption className={styles.caption}>
        <span>Papers I keep coming back to.</span>
        <a href="/github" target="_blank" rel="noreferrer" className={styles.github}>
          <span className="visually-hidden">Tunar on GitHub</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.49c-2.23.48-2.7-.95-2.7-.95-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.77-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.94.29.25.54.74.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 .2Z" />
          </svg>
        </a>
      </figcaption>
    </figure>
  );
}
