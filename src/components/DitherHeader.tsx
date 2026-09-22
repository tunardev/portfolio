"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import {
  BAYER_SIDE,
  ditherCells,
  paintOf,
  patternFills,
  pickScene,
  sceneShapes,
  strokeOf,
  type Kind,
  type SceneSpec,
  type Shape,
} from "./scenes";
import { useTheme } from "./useTheme";
import styles from "./DitherHeader.module.css";

const INK = "var(--ink)";
const SCENE_WIDTH = 1440;
const PLATE_RATIO = 420 / SCENE_WIDTH;
const MIN_PORTRAIT_RATIO = 0.45;
const MAX_PORTRAIT_RATIO = 2.2;
const STATIC_SHAPES = 2;
const MAX_DRIFT_LAYER = 5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function strokeProps(shape: Shape) {
  const stroke = strokeOf(shape);
  if (!stroke) return null;
  return {
    stroke: INK,
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
  className?: string;
};

export function DitherHeader({ seed, full = false, dot = 2, animate = true, kinds, className }: Props) {
  const [spec, setSpec] = useState<SceneSpec | null>(null);
  const dark = useTheme() === "dark";
  const patternId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const ratio = full
        ? clamp(window.innerHeight / window.innerWidth, MIN_PORTRAIT_RATIO, MAX_PORTRAIT_RATIO)
        : PLATE_RATIO;
      const size = { width: SCENE_WIDTH, height: Math.round(SCENE_WIDTH * ratio) };
      setSpec(pickScene(seed ? `${seed}:${Date.now()}` : String(Date.now()), size, kinds));
    });

    return () => cancelAnimationFrame(raf);
  }, [seed, full, kinds]);

  const tint = spec ? `var(--tint-${spec.tint})` : "var(--sage)";

  return (
    <div className={className} style={{ background: tint, overflow: "hidden" }} aria-hidden="true">
      {spec && <Scene spec={spec} dark={dark} dot={dot} animate={animate} full={full} tint={tint} id={patternId} />}
    </div>
  );
}

type SceneProps = {
  spec: SceneSpec;
  dark: boolean;
  dot: number;
  animate: boolean;
  full: boolean;
  tint: string;
  id: string;
};

function Scene({ spec, dark, dot, animate, full, tint, id }: SceneProps) {
  const shapes = sceneShapes(spec);
  const tile = dot * BAYER_SIDE;
  const colors = { none: "none", red: "var(--red)", ink: INK, paper: tint };
  const patternOf = (fill: string) => `${id}-${fill.slice(1)}`;

  const fillOf = (fill: string) => {
    const paint = paintOf(fill, dark);
    return paint === "pattern" ? `url(#${patternOf(fill)})` : colors[paint];
  };

  return (
    <svg
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      preserveAspectRatio="xMidYMid slice"
      className={styles.svg}
      aria-hidden="true"
    >
      <defs>
        {patternFills(shapes, dark).map((fill) => (
          <pattern key={fill} id={patternOf(fill)} width={tile} height={tile} patternUnits="userSpaceOnUse">
            {ditherCells(fill, dark).map(([col, row]) => (
              <rect key={`${col}-${row}`} x={col * dot} y={row * dot} width={dot} height={dot} fill={INK} />
            ))}
          </pattern>
        ))}
      </defs>

      {shapes.map((shape, i) => {
        const fill = fillOf(shape.fill);
        if (i < STATIC_SHAPES || !animate) return <path key={i} d={shape.d} fill={fill} {...strokeProps(shape)} />;

        if (shape.sun) {
          return (
            <g key={i} className={styles.sun}>
              <g className={styles.climb}>
                <path d={shape.d} fill={fill} />
              </g>
            </g>
          );
        }

        const layer = Math.min(i - STATIC_SHAPES, MAX_DRIFT_LAYER);
        const direction = layer % 2 === 0 ? 1 : -1;
        const vars = { "--i": layer, "--dx": full ? 0 : direction * (5 + layer * 4) } as CSSProperties;

        return (
          <g key={i} className={styles.rise} style={vars}>
            <g className={styles.drift}>
              <path d={shape.d} fill={fill} {...strokeProps(shape)} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
