import {
  BAYER_SIDE,
  INK,
  RED,
  TINTS,
  ditherCells,
  paintOf,
  patternFills,
  sceneShapes,
  strokeOf,
  type SceneSpec,
} from "./scenes";

const DARK_INK = "#ECE9E2";
const DARK_PAPER = "#121110";
const DARK_RED = "#E8593D";

type Options = { dot?: number; dark?: boolean; id?: string };

export function sceneSvg(spec: SceneSpec, { dot = 2, dark = false, id = "d" }: Options = {}): string {
  const ink = dark ? DARK_INK : INK;
  const paper = dark ? DARK_PAPER : TINTS[spec.tint];
  const colors = { none: "none", red: dark ? DARK_RED : RED, ink, paper };

  const shapes = sceneShapes(spec);
  const tile = dot * BAYER_SIDE;
  const patternId = (fill: string) => `${id}${fill.slice(1)}`;

  const patterns = patternFills(shapes, dark)
    .map((fill) => {
      const cells = ditherCells(fill, dark)
        .map(([col, row]) => `M${col * dot} ${row * dot}h${dot}v${dot}h-${dot}z`)
        .join("");
      return `<pattern id="${patternId(fill)}" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse"><path d="${cells}" fill="${ink}"/></pattern>`;
    })
    .join("");

  const paths = shapes
    .map((shape) => {
      const paint = paintOf(shape.fill, dark);
      const fill = paint === "pattern" ? `url(#${patternId(shape.fill)})` : colors[paint];
      const stroke = strokeOf(shape);
      const strokeAttrs = stroke
        ? ` stroke="${ink}" stroke-opacity="${stroke.alpha}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round"`
        : "";
      return `<path d="${shape.d}" fill="${fill}"${strokeAttrs}/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}"><rect width="${spec.width}" height="${spec.height}" fill="${paper}"/><defs>${patterns}</defs>${paths}</svg>`;
}
