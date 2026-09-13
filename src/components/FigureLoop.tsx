"use client";

import { useEffect, useState } from "react";
import { FIGURES, STAGE_H, STAGE_W } from "./figures";
import styles from "./FigureLoop.module.css";

const CROSSFADE_MS = 700;

type Frame = { index: number; time: number; fade: number | null };

const smoothstep = (value: number) => value * value * (3 - 2 * value);

export function FigureLoop() {
  const [frame, setFrame] = useState<Frame>({ index: 0, time: 0, fade: null });

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index = 0;
    let startedAt = performance.now();
    let fadeStartedAt = -1;
    let raf = 0;

    const tick = (now: number) => {
      const figure = FIGURES[index];
      const time = (now - startedAt) / 1000 / figure.pace;

      if (fadeStartedAt < 0) {
        if (time >= figure.duration) {
          if (reduced) {
            index = (index + 1) % FIGURES.length;
            startedAt = now;
          } else {
            fadeStartedAt = now;
          }
        }
        setFrame({ index, time: Math.min(time, figure.duration), fade: null });
      } else {
        const fade = Math.min(1, (now - fadeStartedAt) / CROSSFADE_MS);
        setFrame({ index, time: figure.duration, fade });
        if (fade >= 1) {
          fadeStartedAt = -1;
          index = (index + 1) % FIGURES.length;
          startedAt = now;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const current = FIGURES[frame.index];
  const next = FIGURES[(frame.index + 1) % FIGURES.length];
  const fade = frame.fade;
  const captioned = fade !== null && fade > 0.5 ? next : current;

  return (
    <figure className={styles.figure}>
      <svg className={styles.svg} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} role="img" aria-label={captioned.caption}>
        <g opacity={fade === null ? 1 : 1 - smoothstep(fade)}>
          <current.View t={frame.time} />
        </g>
        {fade !== null && (
          <g opacity={smoothstep(fade)}>
            <next.View t={0} />
          </g>
        )}
      </svg>
      <figcaption className={styles.caption}>{captioned.caption}</figcaption>
    </figure>
  );
}
