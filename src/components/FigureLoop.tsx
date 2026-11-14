"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { breakpoints, colors, fontSizes, lineHeights, spacing } from "@/styles/tokens.stylex";
import { FIGURES, STAGE_H, STAGE_W } from "./figures";

const CROSSFADE_MS = 700;
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
    let shouldReduceMotion = motion.matches;
    let index = 0;
    let elapsedMs = 0;
    let fadeMs: number | null = null;
    let last = 0;
    let animationFrame = 0;

    const show = () => {
      const figure = FIGURES[index];
      if (shouldReduceMotion) {
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
          if (shouldReduceMotion) advance();
          else fadeMs = 0;
        }
      }
      if (!shouldReduceMotion || index !== shown) show();

      animationFrame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (animationFrame) return;
      animationFrame = requestAnimationFrame((now) => {
        last = now;
        tick(now);
      });
    };

    const stop = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const onMotionChange = () => {
      shouldReduceMotion = motion.matches;
      show();
    };

    const observer = new IntersectionObserver((entries) => (entries.at(-1)?.isIntersecting ? start() : stop()));
    observer.observe(element);
    motion.addEventListener("change", onMotionChange);
    if (shouldReduceMotion) show();

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
    <figure ref={ref} {...stylex.props(styles.figure)}>
      <svg {...stylex.props(styles.svg)} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true">
        <g opacity={fade === null ? 1 : 1 - smoothstep(fade)}>
          <current.View t={frame.time} />
        </g>
        {fade !== null && (
          <g opacity={smoothstep(fade)}>
            <next.View t={0} />
          </g>
        )}
      </svg>
      <figcaption {...stylex.props(styles.caption)}>{captioned.caption}</figcaption>
    </figure>
  );
}

const styles = stylex.create({
  figure: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    inlineSize: "100%",
    margin: 0,
    paddingBlockStart: spacing.sm,
    paddingBlockEnd: spacing.xxs,
  },
  svg: {
    display: "block",
    overflow: "visible",
    inlineSize: "100%",
    aspectRatio: "680 / 224",
    fontVariantNumeric: "tabular-nums",
  },
  caption: {
    fontSize: { default: fontSizes.small, [breakpoints.mobile]: fontSizes.fine },
    lineHeight: { default: lineHeights.small, [breakpoints.mobile]: lineHeights.fine },
    color: colors.inkSoft,
  },
});
