"use client";

import * as stylex from "@stylexjs/stylex";
import { type MouseEvent, useState } from "react";
import { shelf } from "@/content/shelf";
import { bookPull } from "@/lib/sounds";
import { shelfMarker } from "@/styles/markers.stylex";
import { shared } from "@/styles/shared";
import {
  breakpoints,
  colors,
  durations,
  easings,
  fontSizes,
  lineHeights,
  shadows,
  spacing,
} from "@/styles/tokens.stylex";

const SHELF_LINE = 240;
const LEAN_DEG = 8;
const LEAN_TAN = Math.tan((LEAN_DEG * Math.PI) / 180);
const GAP = 6;
const BOOKEND = { width: 10, height: 114 };
const CASCADE_MS = 22;
const REACH_ABOVE = 12;

const lefts = shelf.map((_, i) => shelf.slice(0, i).reduce((x, paper) => x + paper.width + GAP, 0));
const shelfRight = lefts[shelf.length - 1] + shelf[shelf.length - 1].width;
const bookendLeft = Math.round(shelfRight + BOOKEND.height * LEAN_TAN);
const tallest = Math.max(...shelf.map((paper) => paper.height));

export function Shelf() {
  const [pushed, setPushed] = useState<number | null>(null);

  const isTilted = (index: number) => pushed !== null && index >= pushed;

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
      const lean = isTilted(i) ? (SHELF_LINE - y) * LEAN_TAN : 0;
      const left = lefts[i] + lean;
      if (x >= left && x <= left + shelf[i].width && y >= SHELF_LINE - shelf[i].height) {
        setPushed(i);
        return;
      }
    }
  };

  return (
    <figure {...stylex.props(styles.shelf)}>
      <div {...stylex.props(styles.stage)}>
        <div {...stylex.props(styles.inner, shelfMarker)} onMouseMove={track} onMouseLeave={() => setPushed(null)}>
          <div
            {...stylex.props(styles.bookend)}
            aria-hidden="true"
            style={{
              left: bookendLeft,
              top: SHELF_LINE - BOOKEND.height,
              width: BOOKEND.width,
              height: BOOKEND.height,
            }}
          >
            <span
              {...stylex.props(styles.bookendBase)}
              style={{ left: shelfRight - bookendLeft, width: bookendLeft + BOOKEND.width - shelfRight }}
            />
          </div>

          {shelf.map((paper, i) => {
            const isActive = pushed === i;
            const isTipped = paper.leaning ? !isActive : isTilted(i);
            const delay = pushed !== null && i > pushed ? (i - pushed) * CASCADE_MS : 0;

            return (
              <a
                key={paper.title}
                href={paper.href}
                target="_blank"
                rel="noreferrer"
                {...stylex.props(
                  styles.book,
                  paper.darkCover && styles.bookDarkCover,
                  (isTipped || isActive) && styles.bookTipped,
                  isActive && styles.bookActive,
                )}
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
                  transform: isTipped ? `rotate(${LEAN_DEG}deg)` : undefined,
                  transitionDelay: delay ? `${delay}ms` : undefined,
                }}
              >
                <span {...stylex.props(styles.title)}>{paper.title}</span>
                <span {...stylex.props(styles.year)}>{paper.year}</span>
              </a>
            );
          })}

          <div {...stylex.props(styles.line)} />
          <div {...stylex.props(styles.shadow)} />
        </div>
      </div>

      <figcaption {...stylex.props(styles.caption)}>
        <span>Papers I keep coming back to.</span>
        <a href="/github" target="_blank" rel="noreferrer" {...stylex.props(styles.github)}>
          <span {...stylex.props(shared.visuallyHidden)}>Tunar on GitHub</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.49c-2.23.48-2.7-.95-2.7-.95-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.77-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.94.29.25.54.74.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 .2Z" />
          </svg>
        </a>
      </figcaption>
    </figure>
  );
}

const NARROW_SCREEN = "@media (max-width: 380px)";

const styles = stylex.create({
  shelf: {
    display: "flex",
    flexDirection: "column",
    gap: { default: spacing.xl, [breakpoints.mobile]: spacing.md },
    inlineSize: "100%",
    marginBlockStart: { default: spacing.xxxl, [breakpoints.mobile]: "28px" },
    marginBlockEnd: 0,
    marginInline: 0,
  },
  stage: {
    position: "relative",
    inlineSize: "100%",
    blockSize: { default: "250px", [breakpoints.mobile]: "165px", [NARROW_SCREEN]: "150px" },
  },
  inner: {
    position: "relative",
    inlineSize: { default: "100%", [breakpoints.mobile]: "520px" },
    blockSize: "250px",
    transform: { default: null, [breakpoints.mobile]: "scale(0.66)", [NARROW_SCREEN]: "scale(0.6)" },
    transformOrigin: { default: null, [breakpoints.mobile]: "0 0" },
  },
  book: {
    position: "absolute",
    overflow: "hidden",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingBlockEnd: spacing.lg,
    borderStartStartRadius: "2px",
    borderStartEndRadius: "3px",
    borderEndEndRadius: "3px",
    borderEndStartRadius: "2px",
    transformOrigin: "100% 100%",
    boxShadow: shadows.spine,
    willChange: {
      default: null,
      [stylex.when.ancestor(":hover", shelfMarker)]: "transform",
      ":focus-visible": "transform",
    },
    transition: `transform 340ms ${easings.settle}, box-shadow 340ms ease`,
    "::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      backgroundImage:
        "linear-gradient(90deg, rgb(255 255 255 / 22%) 0%, rgb(255 255 255 / 0%) 18%, rgb(26 25 23 / 0%) 70%, rgb(26 25 23 / 14%) 100%)",
      pointerEvents: "none",
    },
    "::after": {
      content: '""',
      position: "absolute",
      insetBlock: "10px",
      insetInline: 0,
      borderBlockStartWidth: "1px",
      borderBlockStartStyle: "solid",
      borderBlockStartColor: "currentColor",
      borderBlockEndWidth: "1px",
      borderBlockEndStyle: "solid",
      borderBlockEndColor: "currentColor",
      opacity: 0.22,
      pointerEvents: "none",
    },
  },
  bookDarkCover: {
    boxShadow: shadows.spineDark,
  },
  bookTipped: {
    boxShadow: shadows.tipped,
  },
  bookActive: {
    zIndex: 2,
  },
  year: {
    position: "absolute",
    insetBlockStart: "19px",
    insetInline: 0,
    fontSize: "9px",
    lineHeight: "12px",
    letterSpacing: "0.06em",
    fontVariantNumeric: "tabular-nums",
    textAlign: "center",
    opacity: 0.7,
  },
  title: {
    writingMode: "vertical-rl",
    transform: "rotate(180deg)",
    fontSize: "12px",
    lineHeight: "16px",
    fontWeight: 500,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  },
  bookend: {
    position: "absolute",
    borderStartStartRadius: "1px",
    borderStartEndRadius: "1px",
    borderEndEndRadius: 0,
    borderEndStartRadius: 0,
    backgroundColor: colors.ink,
  },
  bookendBase: {
    position: "absolute",
    insetBlockEnd: 0,
    blockSize: "4px",
    borderStartStartRadius: 0,
    borderStartEndRadius: "1px",
    borderEndEndRadius: 0,
    borderEndStartRadius: 0,
    backgroundColor: colors.ink,
  },
  line: {
    position: "absolute",
    insetBlockStart: "240px",
    insetInlineStart: 0,
    inlineSize: "100%",
    blockSize: "3px",
    backgroundColor: colors.wash,
    borderBlockStartWidth: "1px",
    borderBlockStartStyle: "solid",
    borderBlockStartColor: colors.line,
  },
  shadow: {
    position: "absolute",
    insetBlockStart: "243px",
    insetInlineStart: 0,
    inlineSize: "100%",
    blockSize: "10px",
    backgroundImage: "linear-gradient(180deg, rgb(26 25 23 / 8%) 0%, rgb(26 25 23 / 0%) 100%)",
  },
  caption: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    color: colors.inkSoft,
  },
  github: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "20px",
    blockSize: "20px",
    color: { default: colors.inkFaint, ":hover": colors.ink },
    transition: `color ${durations.fast} ease`,
  },
});
