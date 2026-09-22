"use client";

import { useEffect, useRef, useState } from "react";
import { FIGURES, STAGE_H, STAGE_W } from "./figures";
import styles from "./FigureLoop.module.css";

const CROSSFADE_MS = 700;
// a hidden tab stops requestAnimationFrame, so the first frame back reports the whole absence as one step
const MAX_STEP_MS = 100;

type Frame = { index: number; time: number; fade: number | null };

const smoothstep = (value: number) => value * value * (3 - 2 * value);

export function FigureLoop() {
  const ref = useRef<HTMLElement>(null);
  const [frame, setFrame] = useState<Frame>({ index: 0, time: 0, fade: null });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;
    let index = 0;
    let elapsedMs = 0;
    let fadeMs: number | null = null;
    let last = 0;
    let raf = 0;

    const show = () => {
      const figure = FIGURES[index];
      if (reduced) {
        setFrame({ index, time: figure.duration, fade: null });
        return;
      }
      setFrame({
        index,
        time: Math.min(elapsedMs / 1000 / figure.pace, figure.duration),
        fade: fadeMs === null ? null : Math.min(1, fadeMs / CROSSFADE_MS),
      });
    };

    const advance = () => {
      index = (index + 1) % FIGURES.length;
      elapsedMs = 0;
      fadeMs = null;
    };

    const tick = (now: number) => {
      const step = Math.min(now - last, MAX_STEP_MS);
      last = now;

      const shown = index;
      const figure = FIGURES[index];
      if (fadeMs !== null) {
        fadeMs += step;
        if (fadeMs >= CROSSFADE_MS) advance();
      } else {
        elapsedMs += step;
        if (elapsedMs >= figure.duration * figure.pace * 1000) {
          if (reduced) advance();
          else fadeMs = 0;
        }
      }
      if (!reduced || index !== shown) show();

      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf) return;
      raf = requestAnimationFrame((now) => {
        last = now;
        tick(now);
      });
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onMotionChange = () => {
      reduced = motion.matches;
      show();
    };

    const observer = new IntersectionObserver((entries) => (entries.at(-1)?.isIntersecting ? start() : stop()));
    observer.observe(element);
    motion.addEventListener("change", onMotionChange);
    if (reduced) show();

    return () => {
      stop();
      observer.disconnect();
      motion.removeEventListener("change", onMotionChange);
    };
  }, []);

  const current = FIGURES[frame.index];
  const next = FIGURES[(frame.index + 1) % FIGURES.length];
  const fade = frame.fade;
  const captioned = fade !== null && fade > 0.5 ? next : current;

  return (
    <figure ref={ref} className={styles.figure}>
      <svg className={styles.svg} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true">
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
