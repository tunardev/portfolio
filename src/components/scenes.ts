export const TINTS = {
  sage: "#DCE8D3",
  sky: "#D9E4F0",
  manila: "#EEE3BC",
  blush: "#F1DCD8",
  stone: "#E4E3DE",
  mint: "#D4E8E0",
} as const;

export type Tint = keyof typeof TINTS;

export const KINDS = [
  "bells",
  "sine",
  "histogram",
  "walk",
  "lighthouse",
  "columns",
  "desk",
  "road",
  "spire",
  "window",
  "doorway",
  "floor",
  "telescope",
  "chess",
  "spiral",
  "tree",
  "scatter",
  "tiles",
] as const;

export type Kind = (typeof KINDS)[number];

export const PORTRAIT_KINDS: Kind[] = ["bells", "sine", "walk", "spire", "tree", "lighthouse"];

export type SceneSpec = {
  width: number;
  height: number;
  tint: Tint;
  kind: Kind;
  sun: { x: number; y: number; r: number } | null;
  seed: number;
};

export type Shape = { fill: string; d: string; stroke?: string; width?: number; sun?: true };

export const INK = "#1A1917";
export const RED = "#D9472B";

const SKY = "#FFFFFF";
const FAR = "#B9B9B9";
const MID = "#7E7E7E";
const NEAR = "#3A3A3A";
const GROUND = "#141414";
const SUN = "#6A6A6A";

// a grey's index is how many of the 16 bayer cells it lights
const LEVELS = [
  SKY,
  "#F2F2F2",
  "#EDEDED",
  "#E0E0E0",
  FAR,
  "#A8A8A8",
  "#9A9A9A",
  "#8C8C8C",
  MID,
  "#747474",
  SUN,
  "#525252",
  NEAR,
  "#2E2E2E",
  "#222222",
  GROUND,
  INK,
] as const;

const DENSITY = new Map<string, number>(LEVELS.map((hex, i) => [hex, i]));

const level = (n: number) => LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Math.round(n)))];

const STROKE_ALPHA: Record<string, number> = {
  [GROUND]: 0.9,
  [NEAR]: 0.7,
  [MID]: 0.5,
  [FAR]: 0.3,
  [INK]: 1,
};
const DEFAULT_STROKE_ALPHA = 0.6;
const DEFAULT_STROKE_WIDTH = 2;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const BAYER_SIDE = 4;
const SOLID_DENSITY = BAYER.length;
const DEFAULT_DENSITY = 8;

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickScene(
  seedString: string,
  { width, height }: { width: number; height: number },
  kinds: readonly Kind[] = KINDS,
): SceneSpec {
  const seed = hash(seedString);
  const rnd = mulberry32(seed);
  const tints = Object.keys(TINTS) as Tint[];
  return {
    width,
    height,
    tint: tints[Math.floor(rnd() * tints.length)],
    kind: kinds[Math.floor(rnd() * kinds.length)],
    sun:
      rnd() < 0.55
        ? {
            x: width * (0.12 + rnd() * 0.76),
            y: height * (0.14 + rnd() * 0.34),
            r: Math.min(width, height) * (0.033 + rnd() * 0.05),
          }
        : null,
    seed,
  };
}

export type Paint = "none" | "red" | "ink" | "paper" | "pattern";

function densityOf(fill: string, dark: boolean) {
  const density = DENSITY.get(fill) ?? DEFAULT_DENSITY;
  return dark && density < SOLID_DENSITY ? Math.ceil(density / 2) : density;
}

export function paintOf(fill: string, dark: boolean): Paint {
  if (fill === "none") return "none";
  if (fill === RED) return "red";
  const density = densityOf(fill, dark);
  if (density >= SOLID_DENSITY) return "ink";
  if (density === 0) return "paper";
  return "pattern";
}

export function patternFills(shapes: readonly Shape[], dark: boolean): string[] {
  return [...new Set(shapes.map((shape) => shape.fill))].filter((fill) => paintOf(fill, dark) === "pattern");
}

/** Lit cells of one bayer tile for this fill, as [column, row]. */
export function ditherCells(fill: string, dark: boolean): [number, number][] {
  const density = densityOf(fill, dark);
  const cells: [number, number][] = [];
  BAYER.forEach((threshold, i) => {
    if (threshold < density) cells.push([i % BAYER_SIDE, Math.floor(i / BAYER_SIDE)]);
  });
  return cells;
}

export function strokeOf(shape: Shape): { alpha: number; width: number } | null {
  if (!shape.stroke) return null;
  return {
    alpha: STROKE_ALPHA[shape.stroke] ?? DEFAULT_STROKE_ALPHA,
    width: shape.width ?? DEFAULT_STROKE_WIDTH,
  };
}

type Point = [number, number];

const snap = (value: number) => Math.round(value * 10) / 10;

type Sketch = {
  w: number;
  h: number;
  unit: number;
  rnd: () => number;
  rect(x: number, y: number, rw: number, rh: number, fill: string): void;
  poly(pts: Point[], fill: string): void;
  line(pts: Point[], color: string, width: number): void;
  segment(from: Point, to: Point, color: string, width: number): void;
  disc(x: number, y: number, r: number, fill: string): void;
  trapezoid(cx: number, yBase: number, halfBase: number, yTop: number, halfTop: number, fill: string): void;
  ramp(y: number, rh: number, levels: number[]): void;
  band(pts: Point[], fill: string): void;
  ground(y: number): void;
  drawSun(): void;
};

function sketch(spec: SceneSpec, shapes: Shape[]): Sketch {
  const { width: w, height: h, sun } = spec;

  const trace = (pts: Point[]) => pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${snap(x)} ${snap(y)}`).join("");
  const circle = (x: number, y: number, r: number) => {
    const [cx, cy, rr] = [snap(x), snap(y), snap(r)];
    const [l, rt] = [snap(cx - rr), snap(cx + rr)];
    return `M${l} ${cy}A${rr} ${rr} 0 1 0 ${rt} ${cy}A${rr} ${rr} 0 1 0 ${l} ${cy}Z`;
  };

  const rect = (x: number, y: number, rw: number, rh: number, fill: string) => {
    const [a, b, c, e] = [snap(x), snap(y), snap(rw), snap(rh)];
    shapes.push({ fill, d: `M${a} ${b}h${c}v${e}h${-c}Z` });
  };
  const poly = (pts: Point[], fill: string) => {
    shapes.push({ fill, d: `${trace(pts)}Z` });
  };
  const line = (pts: Point[], color: string, width: number) => {
    shapes.push({ fill: "none", stroke: color, width, d: trace(pts) });
  };
  const disc = (x: number, y: number, r: number, fill: string) => {
    shapes.push({ fill, d: circle(x, y, r) });
  };
  const ramp = (y: number, rh: number, levels: number[]) => {
    const step = rh / levels.length;
    levels.forEach((n, i) => {
      rect(0, y + i * step, w, step + 0.5, level(n));
    });
  };

  return {
    w,
    h,
    unit: Math.min(w, h),
    rnd: mulberry32(spec.seed ^ 0x9e3779b9),
    rect,
    poly,
    line,
    disc,
    ramp,
    segment: (from, to, color, width) => line([from, to], color, width),
    trapezoid: (cx, yBase, halfBase, yTop, halfTop, fill) =>
      poly(
        [
          [cx - halfBase, yBase],
          [cx + halfBase, yBase],
          [cx + halfTop, yTop],
          [cx - halfTop, yTop],
        ],
        fill,
      ),
    band(pts, fill) {
      const foot = h * 0.07;
      poly([[0, h], ...pts, [w, h]], fill);
      poly([[0, h], ...pts.map(([x, y]): Point => [x, y + foot]), [w, h]], level((DENSITY.get(fill) ?? 0) + 2));
    },
    ground(y) {
      const lit = Math.min(h - y, h * 0.06);
      ramp(y, lit, [13, 14]);
      if (h - y - lit > 0.5) rect(0, y + lit, w, h - y - lit, GROUND);
    },
    drawSun() {
      if (!sun) return;
      for (const [k, n] of [
        [2.1, 1],
        [1.6, 2],
        [1.28, 3],
      ] as const) {
        disc(sun.x, sun.y, sun.r * k, level(n));
      }
      shapes.push({ fill: SUN, d: circle(sun.x, sun.y, sun.r), sun: true });
    },
  };
}

function wave(w: number, y0: number, amp: number, period: number, phase: number): Point[] {
  const pts: Point[] = [];
  for (let x = 0; x <= w; x += 16) pts.push([x, y0 + amp * Math.sin((x / period) * Math.PI * 2 + phase)]);
  return pts;
}

function smooth(rnd: () => number, w: number, y0: number, amp: number, n: number): Point[] {
  const pts: Point[] = [];
  const phases = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let x = 0; x <= w; x += 16) {
    const y =
      y0 +
      amp * 0.6 * Math.sin((x / w) * Math.PI * n + phases[0]) +
      amp * 0.3 * Math.sin((x / w) * Math.PI * n * 2.3 + phases[1]) +
      amp * 0.1 * Math.sin((x / w) * Math.PI * n * 5.1 + phases[2]);
    pts.push([x, y]);
  }
  return pts;
}

// each painter must keep its order of rnd() calls, or every existing seed redraws differently
const PAINTERS: Record<Kind, (s: Sketch) => void> = {
  bells({ w, h, rnd, band, ground, drawSun }) {
    drawSun();
    const gauss = (mu: number, sig: number, amp: number, y0: number) => {
      const pts: Point[] = [];
      for (let x = 0; x <= w; x += 12) pts.push([x, y0 - amp * Math.exp(-((x - mu) ** 2) / (2 * sig * sig))]);
      return pts;
    };
    const mu1 = w * (0.25 + rnd() * 0.3);
    const mu2 = w * (0.6 + rnd() * 0.3);
    band(gauss(mu1, w * 0.12, h * 0.45, h * 0.8), FAR);
    band(gauss(mu2, w * 0.09, h * 0.3, h * 0.82), MID);
    ground(h * 0.94);
  },

  sine({ w, h, rnd, band, drawSun }) {
    drawSun();
    band(wave(w, h * 0.6, h * 0.035, 320, rnd() * 6), FAR);
    band(wave(w, h * 0.72, h * 0.045, 240, rnd() * 6), MID);
    band(wave(w, h * 0.84, h * 0.03, 180, rnd() * 6), NEAR);
  },

  histogram({ w, h, rnd, rect, line, ground, drawSun }) {
    drawSun();
    const n = 24;
    const bw = w / n;
    const peak = 0.3 + rnd() * 0.4;
    const heightAt = (t: number) => {
      const z = (t - peak) / 0.18;
      return h * (0.08 + 0.6 * Math.exp((-z * z) / 2));
    };
    for (let i = 0; i < n; i++) {
      const bh = heightAt(i / n) + (rnd() - 0.5) * h * 0.05;
      rect(i * bw + 6, h * 0.9 - bh, bw - 12, bh, MID);
    }
    const curve: Point[] = [];
    for (let x = 0; x <= w; x += 12) curve.push([x, h * 0.9 - heightAt(x / w)]);
    line(curve, NEAR, 2);
    ground(h * 0.9);
  },

  walk({ w, h, rnd, band, ground, drawSun }) {
    drawSun();
    const pts: Point[] = [];
    let y = h * 0.6;
    for (let x = 0; x <= w; x += 20) {
      y = Math.max(h * 0.28, Math.min(h * 0.8, y + (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 24)));
      pts.push([x, y]);
    }
    band(pts, FAR);
    band(smooth(rnd, w, h * 0.82, h * 0.03, 4), MID);
    ground(h * 0.94);
  },

  lighthouse({ w, h, rnd, rect, poly, band, drawSun }) {
    drawSun();
    rect(0, h * 0.64, w, h - h * 0.64, FAR);
    const lx = w * (0.12 + rnd() * 0.2);
    band(
      [
        [0, h * 0.72],
        [lx - 80, h * 0.6],
        [lx + 120, h * 0.6],
        [lx + 260, h * 0.74],
      ],
      NEAR,
    );
    poly(
      [
        [lx + 8, h * 0.2],
        [lx + 36, h * 0.2],
        [lx + 56, h * 0.64],
        [lx - 12, h * 0.64],
      ],
      NEAR,
    );
    rect(lx, h * 0.14, 44, h * 0.07, NEAR);
    poly(
      [
        [lx + 40, h * 0.17],
        [w, 0],
        [w, h * 0.14],
      ],
      level(2),
    );
    band(wave(w, h * 0.86, 5, 260, rnd() * 6), MID);
  },

  columns({ w, h, rnd, rect, poly, ground, drawSun }) {
    drawSun();
    const cx = w * (0.35 + rnd() * 0.3);
    const top = h * 0.3;
    const base = h * 0.78;
    rect(cx - 280, base, 560, h * 0.05, NEAR);
    rect(cx - 250, base - h * 0.05, 500, h * 0.05, MID);
    for (let i = 0; i < 6; i++) rect(cx - 220 + i * 88, top, 28, base - h * 0.05 - top, NEAR);
    poly(
      [
        [cx - 250, top],
        [cx + 250, top],
        [cx, top - h * 0.16],
      ],
      MID,
    );
    ground(h * 0.9);
  },

  desk({ w, h, rect, poly, line, segment, disc, trapezoid, ground }) {
    ground(h * 0.7);
    const lx = w * 0.26;
    trapezoid(lx, h * 0.7, 12, h * 0.55, 6, NEAR);
    rect(lx - 3, h * 0.28, 6, h * 0.28, NEAR);
    trapezoid(lx, h * 0.31, 34, h * 0.22, 22, NEAR);
    const px = w * 0.46;
    trapezoid(px, h * 0.7, 80, h * 0.42, 66, NEAR);
    trapezoid(px, h * 0.66, 56, h * 0.47, 48, FAR);
    for (let i = 0; i < 4; i++) {
      const y = h * (0.51 + i * 0.035);
      segment([px - 36, y], [px + 30, y], MID, 2);
    }
    rect(w * 0.6, h * 0.6, 26, h * 0.1, NEAR);
    const wx = w * 0.68;
    rect(wx, h * 0.1, w * 0.24, h * 0.6, FAR);
    disc(wx + w * 0.16, h * 0.24, h * 0.06, MID);
    poly(
      [
        [wx, h * 0.7],
        [wx, h * 0.6],
        [wx + w * 0.1, h * 0.52],
        [wx + w * 0.24, h * 0.58],
        [wx + w * 0.24, h * 0.7],
      ],
      MID,
    );
    line(
      [
        [wx, h * 0.1],
        [wx + w * 0.24, h * 0.1],
        [wx + w * 0.24, h * 0.7],
        [wx, h * 0.7],
        [wx, h * 0.1],
      ],
      GROUND,
      4,
    );
    segment([wx + w * 0.12, h * 0.1], [wx + w * 0.12, h * 0.7], GROUND, 3);
  },

  road({ w, h, rect, poly, trapezoid, drawSun }) {
    drawSun();
    const horizon = h * 0.6;
    rect(0, horizon, w, h * 0.4, FAR);
    const vx = w * 0.5;
    poly(
      [
        [w * 0.3, h],
        [w * 0.7, h],
        [vx + 6, horizon],
        [vx - 6, horizon],
      ],
      GROUND,
    );
    for (let i = 0; i < 5; i++) {
      const t0 = 1 - 0.55 ** i;
      const t1 = 1 - 0.55 ** (i + 0.45);
      trapezoid(vx, h - (h - horizon) * t0, 14 * (1 - t0) + 1, h - (h - horizon) * t1, 14 * (1 - t1) + 1, SKY);
    }
    for (const t of [0.15, 0.4, 0.62]) {
      const x = vx + w * (0.06 + t * 0.34);
      const top = horizon - h * (0.34 - t * 0.28);
      rect(x, top, 3 + (1 - t) * 3, horizon - top + h * 0.02 * (1 - t) + 6, NEAR);
      rect(x - 12 * (1 - t) - 4, top, 24 * (1 - t) + 10, 3, NEAR);
    }
  },

  spire({ w, h, unit, rnd, poly, band, ground, drawSun }) {
    drawSun();
    band(smooth(rnd, w, h * 0.7, h * 0.04, 2), FAR);
    const sx = w * (0.22 + rnd() * 0.2);
    poly(
      [
        [sx - 20, h * 0.72],
        [sx + 20, h * 0.72],
        [sx, h * 0.72 - unit * 0.56],
      ],
      NEAR,
    );
    band(smooth(rnd, w, h * 0.88, h * 0.02, 3), NEAR);
    ground(h * 0.95);
  },

  window({ w, h, rect, ground, drawSun }) {
    ground(0);
    const x0 = w * 0.25;
    const x1 = w * 0.75;
    rect(x0, h * 0.08, x1 - x0, h * 0.64, SKY);
    drawSun();
    for (const [bx, bh] of [
      [0.02, 0.22],
      [0.06, 0.3],
      [0.1, 0.18],
      [0.36, 0.1],
      [0.4, 0.16],
    ]) {
      rect(x0 + w * bx, h * 0.72 - h * bh, w * 0.03, h * bh, MID);
    }
    rect(x0 + (x1 - x0) * 0.5 - 4, h * 0.08, 8, h * 0.64, GROUND);
    rect(x0 - 40, h * 0.72, x1 - x0 + 80, h * 0.05, NEAR);
  },

  doorway({ w, h, rect, ground, drawSun }) {
    rect(0, h * 0.1, w * 0.21, h * 0.9, GROUND);
    rect(w * 0.79, h * 0.1, w * 0.21, h * 0.9, GROUND);
    drawSun();
    for (const [bx, bw, bh] of [
      [0.21, 0.3, 0.42],
      [0.33, 0.1, 0.24],
      [0.43, 0.08, 0.16],
      [0.57, 0.06, 0.2],
      [0.63, 0.1, 0.32],
      [0.69, 0.1, 0.42],
    ]) {
      rect(w * bx, h * 0.9 - h * bh, w * bw, h * bh, NEAR);
    }
    ground(h * 0.9);
  },

  floor({ w, h, rect, poly, segment }) {
    const vy = h * 0.6;
    rect(0, vy, w, h - vy, FAR);
    const vx = w * 0.5;
    for (let i = -8; i <= 8; i++) segment([vx, vy], [vx + i * w * 0.14, h], MID, 2);
    for (let i = 1; i < 7; i++) {
      const y = vy + (h - vy) * (1 - 0.6 ** i);
      segment([0, y], [w, y], MID, 2);
    }
    poly(
      [
        [w * 0.36, h * 0.87],
        [w * 0.5, h * 0.87],
        [w * 0.54, h * 0.96],
        [w * 0.38, h * 0.96],
      ],
      GROUND,
    );
    poly(
      [
        [w * 0.44, h * 0.7],
        [w * 0.5, h * 0.7],
        [w * 0.5, h * 0.75],
        [w * 0.43, h * 0.75],
      ],
      GROUND,
    );
  },

  telescope({ w, h, unit, rnd, poly, segment, disc, band, ground }) {
    band(smooth(rnd, w, h * 0.86, h * 0.03, 2), FAR);
    ground(h * 0.93);
    const bx = w * 0.48;
    const by = h * 0.93;
    const ax = bx + w * 0.02;
    const ay = h * 0.8;
    for (const footX of [bx, bx + w * 0.04, bx + w * 0.02]) segment([footX, by], [ax, ay], NEAR, 3);
    const dx = unit * 0.22;
    const dy = -unit * 0.28;
    const len = Math.hypot(dx, dy);
    const nx = (-dy / len) * h * 0.02;
    const ny = (dx / len) * h * 0.02;
    poly(
      [
        [ax - dx * 0.35 - nx, ay - dy * 0.35 - ny],
        [ax + dx - nx, ay + dy - ny],
        [ax + dx + nx, ay + dy + ny],
        [ax - dx * 0.35 + nx, ay - dy * 0.35 + ny],
      ],
      NEAR,
    );
    disc(ax + dx + unit * 0.09, ay + dy - unit * 0.08, unit * 0.09, MID);
  },

  chess({ w, h, rect, poly, disc, trapezoid }) {
    const sq = w / 8;
    for (let i = 0; i < 8; i++) rect(i * sq, h * 0.9, sq, h * 0.1, i % 2 === 0 ? GROUND : FAR);
    const rx = w * 0.4;
    rect(rx - 14, h * 0.74, 28, h * 0.16, NEAR);
    rect(rx - 18, h * 0.7, 36, h * 0.05, NEAR);
    for (let i = 0; i < 3; i++) rect(rx - 18 + i * 14, h * 0.66, 8, h * 0.05, NEAR);
    const qx = w * 0.55;
    trapezoid(qx, h * 0.9, 26, h * 0.62, 14, NEAR);
    poly(
      [
        [qx - 18, h * 0.62],
        [qx + 18, h * 0.62],
        [qx + 12, h * 0.54],
        [qx, h * 0.6],
        [qx - 12, h * 0.54],
      ],
      NEAR,
    );
    disc(qx, h * 0.52, 5, NEAR);
    const px = w * 0.7;
    rect(px - 12, h * 0.86, 24, h * 0.04, NEAR);
    trapezoid(px, h * 0.86, 8, h * 0.76, 4, NEAR);
    disc(px, h * 0.73, 8, NEAR);
  },

  spiral({ w, h, rect, line, disc, ground }) {
    rect(0, h * 0.82, w, h * 0.18, FAR);
    ground(h * 0.94);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const pts: Point[] = [];
    for (let t = 0; t < Math.PI * 4.2; t += 0.08) {
      const r = h * 0.012 * t * t * 0.55 + h * 0.02;
      pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
    line(pts, NEAR, 2);
    disc(cx, cy, h * 0.07, GROUND);
  },

  tree({ w, h, unit, rnd, rect, line, disc, band, ground }) {
    band(smooth(rnd, w, h * 0.84, h * 0.02, 2), FAR);
    ground(h * 0.93);
    const tx = w * 0.45;
    rect(tx - 10, h * 0.93 - unit * 0.43, 20, unit * 0.43, NEAR);
    disc(tx, h * 0.93 - unit * 0.43, unit * 0.16, MID);
    disc(tx - unit * 0.13, h * 0.93 - unit * 0.35, unit * 0.12, MID);
    disc(tx + unit * 0.14, h * 0.93 - unit * 0.36, unit * 0.13, MID);
    for (const k of [-1, -0.4, 0.4, 1]) {
      line(
        [
          [tx, h * 0.93],
          [tx + k * w * 0.02, h * 0.98],
          [tx + k * w * 0.055, h],
        ],
        NEAR,
        2,
      );
    }
  },

  scatter({ w, h, rnd, segment, disc, ground }) {
    ground(h * 0.95);
    const y0 = h * 0.72;
    const slope = -h * 0.3;
    const pts: Point[] = [];
    for (let i = 0; i < 44; i++) {
      const t = i / 43;
      pts.push([w * (0.06 + t * 0.88), y0 + slope * t + (rnd() - 0.5) * h * 0.12]);
    }
    segment([w * 0.04, y0 + h * 0.02], [w * 0.96, y0 + slope - h * 0.03], NEAR, 2);
    for (const [x, y] of pts) disc(x, y, 5, NEAR);
    const [ox, oy] = pts[Math.floor(pts.length * 0.8)];
    disc(ox, oy - h * 0.05, 6, RED);
  },

  tiles({ w, h, rnd, rect, poly, segment }) {
    const vy = h * 0.6;
    rect(0, vy, w, h - vy, FAR);
    const ys = [0, 0.18, 0.4, 0.68, 1].map((t) => vy + (h - vy) * t);
    for (const y of ys.slice(1, -1)) segment([0, y + (rnd() - 0.5) * 8], [w, y + (rnd() - 0.5) * 8], MID, 2);
    for (let i = -6; i <= 6; i++) {
      const jitter = (rnd() - 0.5) * w * 0.03;
      segment([w * 0.5 + i * w * 0.05 + jitter, vy], [w * 0.5 + i * w * 0.19 + jitter * 3, h], MID, 2);
    }
    const k = Math.floor(rnd() * 5) - 2;
    const top = ys[2];
    const bottom = ys[3];
    poly(
      [
        [w * 0.5 + (k - 0.5) * w * 0.11, top],
        [w * 0.5 + (k + 0.5) * w * 0.11, top],
        [w * 0.5 + (k + 0.5) * w * 0.155, bottom],
        [w * 0.5 + (k - 0.5) * w * 0.155, bottom],
      ],
      GROUND,
    );
  },
};

export function sceneShapes(spec: SceneSpec): Shape[] {
  const shapes: Shape[] = [];
  const s = sketch(spec, shapes);
  const steps = Math.max(14, Math.round(s.h / 40));
  const sky = Array.from({ length: steps }, (_, i) => Math.floor((i / steps) * 4.6));
  s.ramp(0, s.h, sky);
  PAINTERS[spec.kind](s);
  return shapes;
}
