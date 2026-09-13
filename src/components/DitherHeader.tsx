"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import {
  BAYER,
  BAYER_SIDE,
  DEFAULT_DENSITY,
  DENSITY,
  RED,
  SOLID_DENSITY,
  STROKE_ALPHA,
  SUN,
  pickScene,
  sceneShapes,
  type Kind,
  type SceneSpec,
} from "./scenes";
import styles from "./DitherHeader.module.css";

const INK = "var(--ink)";
const SCENE_WIDTH = 1440;
const PLATE_RATIO = 420 / SCENE_WIDTH;
const MIN_PORTRAIT_RATIO = 0.45;
const MAX_PORTRAIT_RATIO = 2.2;
const STATIC_SHAPES = 2;
const MAX_DRIFT_LAYER = 5;
const DEFAULT_STROKE_ALPHA = 0.6;
const DEFAULT_STROKE_WIDTH = 2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Props = {
  seed?: string;
  full?: boolean;
  dot?: number;
  animate?: boolean;
  kinds?: readonly Kind[];
  className?: string;
  style?: CSSProperties;
};

export function DitherHeader({ seed, full = false, dot = 2, animate = true, kinds, className, style }: Props) {
  const [spec, setSpec] = useState<SceneSpec | null>(null);
  const [dark, setDark] = useState(false);
  const patternId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const read = () => {
      const forced = document.documentElement.dataset.theme;
      setDark(forced ? forced === "dark" : media.matches);
    };

    read();
    media.addEventListener("change", read);

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      media.removeEventListener("change", read);
      observer.disconnect();
    };
  }, []);

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
  const shapes = spec ? sceneShapes(spec) : [];
  const tile = dot * BAYER_SIDE;

  const densityOf = (fill: string) => {
    const density = DENSITY[fill] ?? DEFAULT_DENSITY;
    return dark && density < SOLID_DENSITY ? Math.ceil(density / 2) : density;
  };

  const patterned = [...new Set(shapes.map((shape) => shape.fill))].filter(
    (fill) => fill !== "none" && fill !== RED && densityOf(fill) > 0 && densityOf(fill) < SOLID_DENSITY,
  );

  const fillOf = (fill: string) => {
    if (fill === "none") return "none";
    if (fill === RED) return "var(--red)";
    const density = densityOf(fill);
    if (density >= SOLID_DENSITY) return INK;
    if (density === 0) return tint;
    return `url(#${patternId}-${fill.slice(1)})`;
  };

  const strokeOf = (shape: { stroke?: string; width?: number }) =>
    shape.stroke
      ? {
          stroke: INK,
          strokeOpacity: STROKE_ALPHA[shape.stroke] ?? DEFAULT_STROKE_ALPHA,
          strokeWidth: shape.width ?? DEFAULT_STROKE_WIDTH,
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const,
        }
      : {};

  return (
    <div className={className} style={{ background: tint, overflow: "hidden", ...style }} aria-hidden="true">
      {spec && (
        <svg
          viewBox={`0 0 ${spec.width} ${spec.height}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <defs>
            {patterned.map((fill) => (
              <pattern
                key={fill}
                id={`${patternId}-${fill.slice(1)}`}
                width={tile}
                height={tile}
                patternUnits="userSpaceOnUse"
              >
                {BAYER.map((threshold, i) =>
                  threshold < densityOf(fill) ? (
                    <rect
                      key={i}
                      x={(i % BAYER_SIDE) * dot}
                      y={Math.floor(i / BAYER_SIDE) * dot}
                      width={dot}
                      height={dot}
                      fill={INK}
                    />
                  ) : null,
                )}
              </pattern>
            ))}
          </defs>

          {shapes.map((shape, i) => {
            const fill = fillOf(shape.fill);
            if (i < STATIC_SHAPES || !animate) return <path key={i} d={shape.d} fill={fill} {...strokeOf(shape)} />;

            if (shape.fill === SUN) {
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
                <g className={styles.drift} style={vars}>
                  <path d={shape.d} fill={fill} {...strokeOf(shape)} />
                </g>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
