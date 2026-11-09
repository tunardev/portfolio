import { describe, expect, test } from "bun:test";
import {
  BAYER_SIDE,
  KINDS,
  PORTRAIT_KINDS,
  RED,
  TINTS,
  ditherCells,
  paintOf,
  patternFills,
  pickScene,
  sceneShapes,
  strokeOf,
} from "./scenes";

const CARD = { width: 1200, height: 630 };
const PORTRAIT = { width: 480, height: 720 };

describe("pickScene", () => {
  test("returns same scene for same seed", () => {
    const once = pickScene("hello-world", CARD);
    const again = pickScene("hello-world", CARD);

    expect(again).toEqual(once);
  });

  test("returns different scenes for different seeds", () => {
    const first = pickScene("hello-world", CARD);
    const second = pickScene("second-seed", CARD);

    expect(second.seed).not.toBe(first.seed);
    expect(second).not.toEqual(first);
  });

  test("preserves given size", () => {
    expect(pickScene("post-one", CARD)).toMatchObject(CARD);
    expect(pickScene("post-one", PORTRAIT)).toMatchObject({ width: 480, height: 720 });
  });

  test("returns known tint and kind", () => {
    const tints = Object.keys(TINTS);

    for (let i = 0; i < 200; i++) {
      const spec = pickScene(`seed-${i}`, CARD);

      expect(tints).toContain(spec.tint);
      expect(KINDS).toContain(spec.kind);
    }
  });

  test("respects restricted kinds", () => {
    for (let i = 0; i < 200; i++) {
      expect(PORTRAIT_KINDS).toContain(pickScene(`portrait-${i}`, PORTRAIT, PORTRAIT_KINDS).kind);
    }
  });

  test("places optional sun within bounds", () => {
    let suns = 0;

    for (let i = 0; i < 200; i++) {
      const spec = pickScene(`sun-${i}`, CARD);
      if (!spec.sun) continue;
      suns++;
      const { x, y, r } = spec.sun;

      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(Number.isFinite(r)).toBe(true);
      expect(r).toBeGreaterThan(0);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(spec.width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(spec.height);
    }

    expect(suns).toBeGreaterThan(0);
    expect(suns).toBeLessThan(200);
  });
});

describe("sceneShapes", () => {
  test("returns paintable shapes for every kind", () => {
    const base = pickScene("shapes", CARD);

    for (const kind of KINDS) {
      const shapes = sceneShapes({ ...base, kind });

      expect(shapes.length).toBeGreaterThan(0);
      for (const shape of shapes) {
        expect(shape.d.length).toBeGreaterThan(0);
        expect(shape.fill === "none" || shape.fill.startsWith("#")).toBe(true);
      }
    }
  });

  test("returns same shapes for same scene", () => {
    const spec = pickScene("stable", CARD);

    expect(sceneShapes(spec)).toEqual(sceneShapes(spec));
  });

  test("sets color and width on strokes", () => {
    const shapes = sceneShapes({ ...pickScene("stroked", CARD), kind: "histogram" });
    const strokes = shapes.filter((shape) => shape.fill === "none");

    expect(strokes.length).toBeGreaterThan(0);
    for (const stroke of strokes) {
      expect(stroke.stroke?.startsWith("#")).toBe(true);
      expect(stroke.width).toBeGreaterThan(0);
    }
  });
});

describe("sceneShapes sun", () => {
  const withSun = (kind: (typeof KINDS)[number]) => {
    for (let i = 0; ; i++) {
      const spec = { ...pickScene(`sunlit-${i}`, CARD), kind };
      if (spec.sun) return spec;
    }
  };

  test("flags at most one sun shape", () => {
    for (const kind of KINDS) {
      const flagged = sceneShapes(withSun(kind)).filter((shape) => shape.sun);

      expect(flagged.length).toBeLessThanOrEqual(1);
    }
  });

  test("does not flag shapes sharing sun fill", () => {
    const shapes = sceneShapes(withSun("sine"));
    const sunGrey = shapes.find((shape) => shape.sun)?.fill;

    expect(shapes.some((shape) => shape.fill === sunGrey && !shape.sun)).toBe(true);
  });

  test("flags no shape without sun", () => {
    const spec = { ...pickScene("sunless", CARD), kind: "bells" as const, sun: null };

    expect(sceneShapes(spec).some((shape) => shape.sun)).toBe(false);
  });
});

describe("paintOf, patternFills, strokeOf", () => {
  test("maps fills to paint types", () => {
    expect(paintOf("none", false)).toBe("none");
    expect(paintOf(RED, false)).toBe("red");
    expect(paintOf("#FFFFFF", false)).toBe("paper");
    expect(paintOf("#1A1917", false)).toBe("ink");
    expect(paintOf("#1A1917", true)).toBe("ink");
    expect(paintOf("#7E7E7E", false)).toBe("pattern");
  });

  test("returns each dithered fill once", () => {
    const shapes = sceneShapes({ ...pickScene("patterns", CARD), kind: "desk" });
    const fills = patternFills(shapes, false);

    expect(new Set(fills).size).toBe(fills.length);
    for (const fill of fills) expect(paintOf(fill, false)).toBe("pattern");
    for (const shape of shapes) {
      if (paintOf(shape.fill, false) === "pattern") expect(fills).toContain(shape.fill);
    }
  });

  test("applies default stroke alpha and width", () => {
    expect(strokeOf({ fill: "#FFFFFF", d: "M0 0" })).toBeNull();
    expect(strokeOf({ fill: "none", d: "M0 0", stroke: "#1A1917", width: 3 })).toEqual({ alpha: 1, width: 3 });
    expect(strokeOf({ fill: "none", d: "M0 0", stroke: "#123456" })).toEqual({ alpha: 0.6, width: 2 });
  });
});

describe("ditherCells", () => {
  const cellKeys = (fill: string, dark: boolean) => ditherCells(fill, dark).map(([col, row]) => `${col},${row}`);

  test("scales cell count with darkness", () => {
    expect(cellKeys("#FFFFFF", false)).toHaveLength(0);
    expect(cellKeys("#B9B9B9", false)).toHaveLength(4);
    expect(cellKeys("#7E7E7E", false)).toHaveLength(8);
    expect(cellKeys("#1A1917", false)).toHaveLength(BAYER_SIDE * BAYER_SIDE);
  });

  test("halves partial grays in dark mode", () => {
    expect(cellKeys("#7E7E7E", true)).toHaveLength(4);
    expect(cellKeys("#F2F2F2", true)).toHaveLength(1);
  });

  test("includes lighter gray cells in darker gray", () => {
    const lighter = cellKeys("#B9B9B9", false);
    const darker = new Set(cellKeys("#7E7E7E", false));

    for (const cell of lighter) expect(darker.has(cell)).toBe(true);
  });

  test("returns cells within tile", () => {
    for (const [col, row] of ditherCells("#3A3A3A", false)) {
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(BAYER_SIDE);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(BAYER_SIDE);
    }
  });
});
