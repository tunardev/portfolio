import {
  BAYER,
  BAYER_SIDE,
  DEFAULT_DENSITY,
  DENSITY,
  INK,
  RED,
  SOLID_DENSITY,
  STROKE_ALPHA,
  TINTS,
  sceneShapes,
  type SceneSpec,
} from "./scenes";

const DARK_INK = "#ECE9E2";
const DARK_PAPER = "#121110";
const DARK_RED = "#E8593D";
const DEFAULT_STROKE_ALPHA = 0.6;
const DEFAULT_STROKE_WIDTH = 2;

type Options = { dot?: number; dark?: boolean; id?: string };

export function sceneSvg(spec: SceneSpec, { dot = 2, dark = false, id = "d" }: Options = {}): string {
  const ink = dark ? DARK_INK : INK;
  const paper = dark ? DARK_PAPER : TINTS[spec.tint];
  const red = dark ? DARK_RED : RED;

  const shapes = sceneShapes(spec);
  const tile = dot * BAYER_SIDE;

  const densityOf = (fill: string) => {
    const density = DENSITY[fill] ?? DEFAULT_DENSITY;
    return dark && density < SOLID_DENSITY ? Math.ceil(density / 2) : density;
  };

  const patterns = [...new Set(shapes.map((shape) => shape.fill))]
    .filter((fill) => fill !== "none" && fill !== RED)
    .filter((fill) => densityOf(fill) > 0 && densityOf(fill) < SOLID_DENSITY)
    .map((fill) => {
      const cells = BAYER.map((threshold, i) =>
        threshold < densityOf(fill)
          ? `M${(i % BAYER_SIDE) * dot} ${Math.floor(i / BAYER_SIDE) * dot}h${dot}v${dot}h-${dot}z`
          : "",
      ).join("");
      return `<pattern id="${id}${fill.slice(1)}" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse"><path d="${cells}" fill="${ink}"/></pattern>`;
    })
    .join("");

  const paths = shapes
    .map((shape) => {
      const density = densityOf(shape.fill);
      const fill =
        shape.fill === "none"
          ? "none"
          : shape.fill === RED
            ? red
            : density >= SOLID_DENSITY
              ? ink
              : density === 0
                ? paper
                : `url(#${id}${shape.fill.slice(1)})`;

      const stroke = shape.stroke
        ? ` stroke="${ink}" stroke-opacity="${STROKE_ALPHA[shape.stroke] ?? DEFAULT_STROKE_ALPHA}" stroke-width="${
            shape.width ?? DEFAULT_STROKE_WIDTH
          }" stroke-linecap="round" stroke-linejoin="round"`
        : "";

      return `<path d="${shape.d}" fill="${fill}"${stroke}/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}"><rect width="${spec.width}" height="${spec.height}" fill="${paper}"/><defs>${patterns}</defs>${paths}</svg>`;
}
