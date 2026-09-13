import { describe, expect, test } from "bun:test";
import { BAYER, BAYER_SIDE, KINDS, PORTRAIT_KINDS, TINTS, pickScene, sceneShapes } from "./scenes";

const CARD = { width: 1200, height: 630 };
const PORTRAIT = { width: 480, height: 720 };

describe("pickScene", () => {
  test("is deterministic for a seed and size", () => {
    const once = pickScene("hello-world", CARD);
    const again = pickScene("hello-world", CARD);

    expect(again).toEqual(once);
    expect(pickScene("hello-world", CARD)).toEqual(once);
  });

  test("gives different seeds different scenes", () => {
    const first = pickScene("hello-world", CARD);
    const second = pickScene("second-seed", CARD);

    expect(second.seed).not.toBe(first.seed);
    expect(second).not.toEqual(first);
  });

  test("keeps the size it was handed", () => {
    expect(pickScene("post-one", CARD).width).toBe(1200);
    expect(pickScene("post-one", CARD).height).toBe(630);
    expect(pickScene("post-one", PORTRAIT)).toMatchObject({ width: 480, height: 720 });
  });

  test("always lands on a known tint and a known kind", () => {
    const tints = Object.keys(TINTS);

    for (let i = 0; i < 200; i++) {
      const spec = pickScene(`seed-${i}`, CARD);

      expect(tints).toContain(spec.tint);
      expect(KINDS).toContain(spec.kind);
    }
  });

  test("stays inside a restricted kind list", () => {
    for (let i = 0; i < 200; i++) {
      expect(PORTRAIT_KINDS).toContain(pickScene(`portrait-${i}`, PORTRAIT, PORTRAIT_KINDS).kind);
    }
  });

  test("a sun is either absent or a real disc inside the scene", () => {
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
  test("draws every kind as paintable shapes", () => {
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

  test("draws the same shapes for the same spec", () => {
    const spec = pickScene("stable", CARD);

    expect(sceneShapes(spec)).toEqual(sceneShapes(spec));
  });

  test("strokes carry a colour and a width, fills do not", () => {
    const shapes = sceneShapes({ ...pickScene("stroked", CARD), kind: "histogram" });
    const strokes = shapes.filter((shape) => shape.fill === "none");

    expect(strokes.length).toBeGreaterThan(0);
    for (const stroke of strokes) {
      expect(stroke.stroke?.startsWith("#")).toBe(true);
      expect(stroke.width).toBeGreaterThan(0);
    }
  });
});

describe("BAYER", () => {
  test("is a complete four by four ordered dither matrix", () => {
    expect(BAYER).toHaveLength(BAYER_SIDE * BAYER_SIDE);
    expect(new Set(BAYER).size).toBe(16);
    expect([...BAYER].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });
});
