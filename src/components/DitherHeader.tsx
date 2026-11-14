"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useId, useState } from "react";
import { colors, easings, tints } from "@/styles/tokens.stylex";
import {
  BAYER_SIDE,
  ditherCells,
  type Kind,
  paintOf,
  patternFills,
  pickScene,
  type SceneSpec,
  type Shape,
  sceneShapes,
  strokeOf,
} from "./scenes";
import { useTheme } from "./useTheme";

const SCENE_WIDTH = 1440;
const PLATE_RATIO = 420 / SCENE_WIDTH;
const MIN_PORTRAIT_RATIO = 0.45;
const MAX_PORTRAIT_RATIO = 2.2;
const STATIC_SHAPES = 2;
const MAX_DRIFT_LAYER = 5;
const RISE_STAGGER_MS = 140;
const DRIFT_STAGGER_SECONDS = -6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function strokeProps(shape: Shape) {
  const stroke = strokeOf(shape);
  if (!stroke) return null;
  return {
    stroke: colors.ink,
    strokeOpacity: stroke.alpha,
    strokeWidth: stroke.width,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
}

type Props = {
  seed?: string;
  full?: boolean;
  dot?: number;
  animate?: boolean;
  kinds?: readonly Kind[];
  style?: stylex.StyleXStyles;
};

export function DitherHeader({ seed, full = false, dot = 2, animate = true, kinds, style }: Props) {
  const [spec, setSpec] = useState<SceneSpec | null>(null);
  const isDark = useTheme() === "dark";
  const patternId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      const ratio = full
        ? clamp(window.innerHeight / window.innerWidth, MIN_PORTRAIT_RATIO, MAX_PORTRAIT_RATIO)
        : PLATE_RATIO;
      const size = { width: SCENE_WIDTH, height: Math.round(SCENE_WIDTH * ratio) };
      setSpec(pickScene(seed ? `${seed}:${Date.now()}` : String(Date.now()), size, kinds));
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [seed, full, kinds]);

  return (
    <div {...stylex.props(style, styles.container, tintBackgrounds[spec?.tint ?? "sage"])} aria-hidden="true">
      {spec && <Scene spec={spec} isDark={isDark} dot={dot} animate={animate} full={full} id={patternId} />}
    </div>
  );
}

type SceneProps = {
  spec: SceneSpec;
  isDark: boolean;
  dot: number;
  animate: boolean;
  full: boolean;
  id: string;
};

function Scene({ spec, isDark, dot, animate, full, id }: SceneProps) {
  const shapes = sceneShapes(spec);
  const tile = dot * BAYER_SIDE;
  const paints = { none: "none", red: colors.red, ink: colors.ink, paper: tints[spec.tint] };
  const patternOf = (fill: string) => `${id}-${fill.slice(1)}`;

  const fillOf = (fill: string) => {
    const paint = paintOf(fill, isDark);
    return paint === "pattern" ? `url(#${patternOf(fill)})` : paints[paint];
  };

  return (
    <svg
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      preserveAspectRatio="xMidYMid slice"
      {...stylex.props(styles.svg)}
      aria-hidden="true"
    >
      <defs>
        {patternFills(shapes, isDark).map((fill) => (
          <pattern key={fill} id={patternOf(fill)} width={tile} height={tile} patternUnits="userSpaceOnUse">
            {ditherCells(fill, isDark).map(([column, row]) => (
              <rect
                key={`${column}-${row}`}
                x={column * dot}
                y={row * dot}
                width={dot}
                height={dot}
                fill={colors.ink}
              />
            ))}
          </pattern>
        ))}
      </defs>

      {shapes.map((shape, i) => {
        const fill = fillOf(shape.fill);
        if (i < STATIC_SHAPES || !animate) return <path key={i} d={shape.d} fill={fill} {...strokeProps(shape)} />;

        if (shape.sun) {
          return (
            <g key={i} {...stylex.props(styles.sun)}>
              <g {...stylex.props(styles.climb)}>
                <path d={shape.d} fill={fill} />
              </g>
            </g>
          );
        }

        const layer = Math.min(i - STATIC_SHAPES, MAX_DRIFT_LAYER);
        const direction = layer % 2 === 0 ? 1 : -1;
        const driftOffset = full ? 0 : direction * (5 + layer * 4);

        return (
          <g key={i} {...stylex.props(styles.rise, styles.riseDelay(`${layer * RISE_STAGGER_MS}ms`))}>
            <g
              {...stylex.props(
                styles.drift,
                styles.driftMotion(`${layer * DRIFT_STAGGER_SECONDS}s`, String(driftOffset)),
              )}
            >
              <path d={shape.d} fill={fill} {...strokeProps(shape)} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

const riseKeyframes = stylex.keyframes({
  from: {
    transform: "translateY(36px)",
    opacity: 0,
  },
});

const sunKeyframes = stylex.keyframes({
  from: {
    transform: "translateY(56px)",
    opacity: 0,
  },
});

const climbKeyframes = stylex.keyframes({
  to: {
    transform: "translateY(-22px)",
  },
});

const driftKeyframes = stylex.keyframes({
  from: {
    transform: "translateX(calc(var(--drift-offset) * -1px))",
  },
  to: {
    transform: "translateX(calc(var(--drift-offset) * 1px))",
  },
});

const styles = stylex.create({
  container: {
    overflow: "hidden",
  },
  svg: {
    display: "block",
    inlineSize: "100%",
    blockSize: "100%",
  },
  rise: {
    animationName: riseKeyframes,
    animationDuration: "1400ms",
    animationTimingFunction: easings.out,
    animationFillMode: "both",
  },
  riseDelay: (delay: string) => ({
    animationDelay: delay,
  }),
  sun: {
    animationName: sunKeyframes,
    animationDuration: "1900ms",
    animationTimingFunction: easings.out,
    animationFillMode: "both",
  },
  climb: {
    animationName: climbKeyframes,
    animationDuration: "70s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationDirection: "alternate",
  },
  drift: {
    animationName: driftKeyframes,
    animationDuration: "24s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationDirection: "alternate",
  },
  driftMotion: (delay: string, offset: string) => ({
    animationDelay: delay,
    "--drift-offset": offset,
  }),
});

const tintBackgrounds = stylex.create({
  sage: { backgroundColor: tints.sage },
  sky: { backgroundColor: tints.sky },
  manila: { backgroundColor: tints.manila },
  blush: { backgroundColor: tints.blush },
  stone: { backgroundColor: tints.stone },
  mint: { backgroundColor: tints.mint },
});
