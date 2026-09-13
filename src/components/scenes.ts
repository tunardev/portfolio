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

export const PORTRAIT_KINDS: Kind[] = ["bells", "sine", "walk", "spire", "tree", "lighthouse"];

export type Kind = (typeof KINDS)[number];

export type SceneSpec = {
  width: number;
  height: number;
  tint: Tint;
  kind: Kind;
  sun: { x: number; y: number; r: number } | null;
  seed: number;
};

const SKY = "#FFFFFF";
const FAR = "#B9B9B9";
const MID = "#7E7E7E";
const NEAR = "#3A3A3A";
const GROUND = "#141414";
export const SUN = "#6A6A6A";
export const INK = "#1A1917";
export const RED = "#D9472B";

export const LEVELS = [
  "#FFFFFF",
  "#F2F2F2",
  "#EDEDED",
  "#E0E0E0",
  "#B9B9B9",
  "#A8A8A8",
  "#9A9A9A",
  "#8C8C8C",
  "#7E7E7E",
  "#747474",
  "#6A6A6A",
  "#525252",
  "#3A3A3A",
  "#2E2E2E",
  "#222222",
  "#141414",
  "#1A1917",
] as const;
const level = (n: number) => LEVELS[Math.max(0, Math.min(16, Math.round(n)))];
const levelOf = (fill: string) => Math.max(0, LEVELS.indexOf(fill as (typeof LEVELS)[number]));

export const STROKE_ALPHA: Record<string, number> = {
  "#141414": 0.9,
  "#3A3A3A": 0.7,
  "#7E7E7E": 0.5,
  "#B9B9B9": 0.3,
  "#1A1917": 1,
};

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

export type SceneSize = { width: number; height: number };

export function pickScene(seedString: string, size: SceneSize, kinds: readonly Kind[] = KINDS): SceneSpec {
  const seed = hash(seedString);
  const rnd = mulberry32(seed);
  const tints = Object.keys(TINTS) as Tint[];
  const { width, height } = size;
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

export type Painter = {
  fillStyle: string | CanvasGradient;
  strokeStyle: string | CanvasGradient;
  lineWidth: number;
  stroke(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  fill(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  arc(x: number, y: number, r: number, start: number, end: number): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
};

export type Shape = { fill: string; d: string; stroke?: string; width?: number };

class Recorder implements Painter {
  shapes: Shape[] = [];
  fillStyle: string | CanvasGradient = SKY;
  strokeStyle: string | CanvasGradient = NEAR;
  lineWidth = 2;
  private d = "";
  private snap(value: number) {
    return Math.round(value * 10) / 10;
  }
  beginPath() {
    this.d = "";
  }
  moveTo(x: number, y: number) {
    this.d += `M${this.snap(x)} ${this.snap(y)}`;
  }
  lineTo(x: number, y: number) {
    this.d += `L${this.snap(x)} ${this.snap(y)}`;
  }
  closePath() {
    this.d += "Z";
  }
  arc(x: number, y: number, r: number) {
    const [cx, cy, rr] = [this.snap(x), this.snap(y), this.snap(r)];
    const [l, rt] = [this.snap(cx - rr), this.snap(cx + rr)];
    this.d += `M${l} ${cy}A${rr} ${rr} 0 1 0 ${rt} ${cy}A${rr} ${rr} 0 1 0 ${l} ${cy}Z`;
  }
  fill() {
    this.shapes.push({ fill: typeof this.fillStyle === "string" ? this.fillStyle : SKY, d: this.d });
  }
  stroke() {
    this.shapes.push({
      fill: "none",
      stroke: typeof this.strokeStyle === "string" ? this.strokeStyle : NEAR,
      width: this.lineWidth,
      d: this.d,
    });
  }
  fillRect(x: number, y: number, w: number, h: number) {
    const [a, b, c, e] = [this.snap(x), this.snap(y), this.snap(w), this.snap(h)];
    this.shapes.push({
      fill: typeof this.fillStyle === "string" ? this.fillStyle : SKY,
      d: `M${a} ${b}h${c}v${e}h${-c}Z`,
    });
  }
  createLinearGradient() {
    return { addColorStop() {} } as unknown as CanvasGradient;
  }
}

export function sceneShapes(spec: SceneSpec): Shape[] {
  const rec = new Recorder();
  drawScene(rec, spec);
  return rec.shapes;
}

export const DENSITY: Record<string, number> = Object.fromEntries(LEVELS.map((hex, i) => [hex, i]));

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const BAYER_SIDE = 4;
export const SOLID_DENSITY = 16;
export const DEFAULT_DENSITY = 8;

function band(ctx: Painter, w: number, h: number, pts: [number, number][], fill: string, foot = h * 0.07) {
  const draw = (dy: number, f: string) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (const [x, y] of pts) ctx.lineTo(x, y + dy);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = f;
    ctx.fill();
  };
  draw(0, fill);
  if (foot > 0) draw(foot, level(levelOf(fill) + 2));
}

function ramp(ctx: Painter, x: number, y: number, w: number, h: number, levels: number[]) {
  const step = h / levels.length;
  levels.forEach((n, i) => {
    ctx.fillStyle = level(n);
    ctx.fillRect(x, y + i * step, w, step + 0.5);
  });
}

function wave(w: number, y0: number, amp: number, period: number, phase: number, step = 16): [number, number][] {
  const pts: [number, number][] = [];
  for (let x = 0; x <= w; x += step) {
    pts.push([x, y0 + amp * Math.sin((x / period) * Math.PI * 2 + phase)]);
  }
  return pts;
}

function smooth(rnd: () => number, w: number, y0: number, amp: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
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

export function drawScene(ctx: Painter, spec: SceneSpec) {
  const { width: w, height: h, sun, kind } = spec;
  const rnd = mulberry32(spec.seed ^ 0x9e3779b9);
  const unit = Math.min(w, h);

  const steps = Math.max(14, Math.round(h / 40));
  ramp(
    ctx,
    0,
    0,
    w,
    h,
    Array.from({ length: steps }, (_, i) => Math.floor((i / steps) * 4.6)),
  );

  const drawSun = () => {
    if (!sun) return;
    for (const [k, n] of [
      [2.1, 1],
      [1.6, 2],
      [1.28, 3],
    ] as const) {
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, sun.r * k, 0, Math.PI * 2);
      ctx.fillStyle = level(n);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
    ctx.fillStyle = SUN;
    ctx.fill();
  };

  const ground = (y: number) => {
    const lit = Math.min(h - y, h * 0.06);
    ramp(ctx, 0, y, w, lit, [13, 14]);
    if (h - y - lit > 0.5) {
      ctx.fillStyle = GROUND;
      ctx.fillRect(0, y + lit, w, h - y - lit);
    }
  };

  const rect = (x: number, y: number, rw: number, rh: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, rw, rh);
  };
  const trace = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
  };
  const poly = (pts: [number, number][], fill: string) => {
    trace(pts);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const line = (pts: [number, number][], color: string, width: number) => {
    trace(pts);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const disc = (x: number, y: number, r: number, fill: string) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };

  switch (kind) {
    case "bells": {
      drawSun();
      const gauss = (mu: number, sig: number, amp: number, y0: number) => {
        const pts: [number, number][] = [];
        for (let x = 0; x <= w; x += 12) {
          pts.push([x, y0 - amp * Math.exp(-((x - mu) ** 2) / (2 * sig * sig))]);
        }
        return pts;
      };
      const mu1 = w * (0.25 + rnd() * 0.3);
      const mu2 = w * (0.6 + rnd() * 0.3);
      band(ctx, w, h, gauss(mu1, w * 0.12, h * 0.45, h * 0.8), FAR);
      band(ctx, w, h, gauss(mu2, w * 0.09, h * 0.3, h * 0.82), MID);
      ground(h * 0.94);
      break;
    }
    case "sine": {
      drawSun();
      band(ctx, w, h, wave(w, h * 0.6, h * 0.035, 320, rnd() * 6), FAR);
      band(ctx, w, h, wave(w, h * 0.72, h * 0.045, 240, rnd() * 6), MID);
      band(ctx, w, h, wave(w, h * 0.84, h * 0.03, 180, rnd() * 6), NEAR);
      break;
    }
    case "histogram": {
      drawSun();
      const n = 24;
      const bw = w / n;
      const peak = 0.3 + rnd() * 0.4;
      for (let i = 0; i < n; i++) {
        const z = (i / n - peak) / 0.18;
        const bh = h * (0.08 + 0.6 * Math.exp((-z * z) / 2)) + (rnd() - 0.5) * h * 0.05;
        ctx.fillStyle = MID;
        ctx.fillRect(i * bw + 6, h * 0.9 - bh, bw - 12, bh);
      }
      const curve: [number, number][] = [];
      for (let x = 0; x <= w; x += 12) {
        const z = (x / w - peak) / 0.18;
        curve.push([x, h * 0.9 - h * (0.08 + 0.6 * Math.exp((-z * z) / 2))]);
      }
      line(curve, NEAR, 2);
      ground(h * 0.9);
      break;
    }
    case "walk": {
      drawSun();
      const pts: [number, number][] = [];
      let y = h * 0.6;
      for (let x = 0; x <= w; x += 20) {
        y = Math.max(h * 0.28, Math.min(h * 0.8, y + (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 24)));
        pts.push([x, y]);
      }
      band(ctx, w, h, pts, FAR);
      band(ctx, w, h, smooth(rnd, w, h * 0.82, h * 0.03, 4), MID);
      ground(h * 0.94);
      break;
    }
    case "lighthouse": {
      drawSun();
      ctx.fillStyle = FAR;
      ctx.fillRect(0, h * 0.64, w, h - h * 0.64);
      const lx = w * (0.12 + rnd() * 0.2);
      band(
        ctx,
        w,
        h,
        [
          [0, h * 0.72],
          [lx - 80, h * 0.6],
          [lx + 120, h * 0.6],
          [lx + 260, h * 0.74],
        ],
        NEAR,
      );
      ctx.fillStyle = NEAR;
      ctx.beginPath();
      ctx.moveTo(lx + 8, h * 0.2);
      ctx.lineTo(lx + 36, h * 0.2);
      ctx.lineTo(lx + 56, h * 0.64);
      ctx.lineTo(lx - 12, h * 0.64);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(lx, h * 0.14, 44, h * 0.07);
      ctx.fillStyle = "#EDEDED";
      ctx.beginPath();
      ctx.moveTo(lx + 40, h * 0.17);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, h * 0.14);
      ctx.closePath();
      ctx.fill();
      band(ctx, w, h, wave(w, h * 0.86, 5, 260, rnd() * 6), MID);
      break;
    }
    case "columns": {
      drawSun();
      const cx = w * (0.35 + rnd() * 0.3);
      const top = h * 0.3;
      const base = h * 0.78;
      ctx.fillStyle = NEAR;
      ctx.fillRect(cx - 280, base, 560, h * 0.05);
      ctx.fillStyle = MID;
      ctx.fillRect(cx - 250, base - h * 0.05, 500, h * 0.05);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = NEAR;
        ctx.fillRect(cx - 220 + i * 88, top, 28, base - h * 0.05 - top);
      }
      ctx.fillStyle = MID;
      ctx.beginPath();
      ctx.moveTo(cx - 250, top);
      ctx.lineTo(cx + 250, top);
      ctx.lineTo(cx, top - h * 0.16);
      ctx.closePath();
      ctx.fill();
      ground(h * 0.9);
      break;
    }
    case "desk": {
      ground(h * 0.7);
      const lx = w * 0.26;
      poly(
        [
          [lx - 12, h * 0.7],
          [lx + 12, h * 0.7],
          [lx + 6, h * 0.55],
          [lx - 6, h * 0.55],
        ],
        NEAR,
      );
      rect(lx - 3, h * 0.28, 6, h * 0.28, NEAR);
      poly(
        [
          [lx - 34, h * 0.31],
          [lx + 34, h * 0.31],
          [lx + 22, h * 0.22],
          [lx - 22, h * 0.22],
        ],
        NEAR,
      );
      const px = w * 0.46;
      poly(
        [
          [px - 80, h * 0.7],
          [px + 80, h * 0.7],
          [px + 66, h * 0.42],
          [px - 66, h * 0.42],
        ],
        NEAR,
      );
      poly(
        [
          [px - 56, h * 0.66],
          [px + 56, h * 0.66],
          [px + 48, h * 0.47],
          [px - 48, h * 0.47],
        ],
        FAR,
      );
      for (let i = 0; i < 4; i++)
        line(
          [
            [px - 36, h * (0.51 + i * 0.035)],
            [px + 30, h * (0.51 + i * 0.035)],
          ],
          MID,
          2,
        );
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
      line(
        [
          [wx + w * 0.12, h * 0.1],
          [wx + w * 0.12, h * 0.7],
        ],
        GROUND,
        3,
      );
      break;
    }
    case "road": {
      drawSun();
      rect(0, h * 0.6, w, h * 0.4, FAR);
      const vx = w * 0.5;
      poly(
        [
          [w * 0.3, h],
          [w * 0.7, h],
          [vx + 6, h * 0.6],
          [vx - 6, h * 0.6],
        ],
        GROUND,
      );
      for (let i = 0; i < 5; i++) {
        const t0 = 1 - 0.55 ** i;
        const t1 = 1 - 0.55 ** (i + 0.45);
        const y0 = h - (h - h * 0.6) * t0;
        const y1 = h - (h - h * 0.6) * t1;
        const hw0 = 14 * (1 - t0) + 1;
        const hw1 = 14 * (1 - t1) + 1;
        poly(
          [
            [vx - hw0, y0],
            [vx + hw0, y0],
            [vx + hw1, y1],
            [vx - hw1, y1],
          ],
          SKY,
        );
      }
      for (let i = 0; i < 3; i++) {
        const t = [0.15, 0.4, 0.62][i];
        const x = vx + w * (0.06 + t * 0.34);
        const top = h * 0.6 - h * (0.34 - t * 0.28);
        rect(x, top, 3 + (1 - t) * 3, h * 0.6 - top + h * 0.02 * (1 - t) + 6, NEAR);
        rect(x - 12 * (1 - t) - 4, top, 24 * (1 - t) + 10, 3, NEAR);
      }
      break;
    }
    case "spire": {
      drawSun();
      band(ctx, w, h, smooth(rnd, w, h * 0.7, h * 0.04, 2), FAR);
      const sx = w * (0.22 + rnd() * 0.2);
      poly(
        [
          [sx - 20, h * 0.72],
          [sx + 20, h * 0.72],
          [sx, h * 0.72 - unit * 0.56],
        ],
        NEAR,
      );
      band(ctx, w, h, smooth(rnd, w, h * 0.88, h * 0.02, 3), NEAR);
      ground(h * 0.95);
      break;
    }
    case "window": {
      ground(0);
      const x0 = w * 0.25;
      const x1 = w * 0.75;
      rect(x0, h * 0.08, x1 - x0, h * 0.64, SKY);
      drawSun();
      const blocks = [
        [0.02, 0.22],
        [0.06, 0.3],
        [0.1, 0.18],
        [0.36, 0.1],
        [0.4, 0.16],
      ];
      for (const [bx, bh] of blocks) rect(x0 + w * bx, h * 0.72 - h * bh, w * 0.03, h * bh, MID);
      rect(x0 + (x1 - x0) * 0.5 - 4, h * 0.08, 8, h * 0.64, GROUND);
      rect(x0 - 40, h * 0.72, x1 - x0 + 80, h * 0.05, NEAR);
      break;
    }
    case "doorway": {
      rect(0, h * 0.1, w * 0.21, h * 0.9, GROUND);
      rect(w * 0.79, h * 0.1, w * 0.21, h * 0.9, GROUND);
      drawSun();
      const slabs = [
        [0.21, 0.3, 0.42],
        [0.33, 0.1, 0.24],
        [0.43, 0.08, 0.16],
        [0.57, 0.06, 0.2],
        [0.63, 0.1, 0.32],
        [0.69, 0.1, 0.42],
      ];
      for (const [bx, bw, bh] of slabs) rect(w * bx, h * 0.9 - h * bh, w * bw, h * bh, NEAR);
      ground(h * 0.9);
      break;
    }
    case "floor": {
      const vy = h * 0.6;
      rect(0, vy, w, h - vy, FAR);
      const vx = w * 0.5;
      for (let i = -8; i <= 8; i++)
        line(
          [
            [vx, vy],
            [vx + i * w * 0.14, h],
          ],
          MID,
          2,
        );
      for (let i = 1; i < 7; i++) {
        const t = 1 - 0.6 ** i;
        line(
          [
            [0, vy + (h - vy) * t],
            [w, vy + (h - vy) * t],
          ],
          MID,
          2,
        );
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
      break;
    }
    case "telescope": {
      band(ctx, w, h, smooth(rnd, w, h * 0.86, h * 0.03, 2), FAR);
      ground(h * 0.93);
      const bx = w * 0.48;
      const by = h * 0.93;
      line(
        [
          [bx, by],
          [bx + w * 0.02, h * 0.8],
        ],
        NEAR,
        3,
      );
      line(
        [
          [bx + w * 0.04, by],
          [bx + w * 0.02, h * 0.8],
        ],
        NEAR,
        3,
      );
      line(
        [
          [bx + w * 0.02, by],
          [bx + w * 0.02, h * 0.8],
        ],
        NEAR,
        3,
      );
      const ax = bx + w * 0.02;
      const ay = h * 0.8;
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
      break;
    }
    case "chess": {
      const sq = w / 8;
      for (let i = 0; i < 8; i++) rect(i * sq, h * 0.9, sq, h * 0.1, i % 2 === 0 ? GROUND : FAR);
      const rx = w * 0.4;
      rect(rx - 14, h * 0.74, 28, h * 0.16, NEAR);
      rect(rx - 18, h * 0.7, 36, h * 0.05, NEAR);
      for (let i = 0; i < 3; i++) rect(rx - 18 + i * 14, h * 0.66, 8, h * 0.05, NEAR);
      const qx = w * 0.55;
      poly(
        [
          [qx - 26, h * 0.9],
          [qx + 26, h * 0.9],
          [qx + 14, h * 0.62],
          [qx - 14, h * 0.62],
        ],
        NEAR,
      );
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
      poly(
        [
          [px - 8, h * 0.86],
          [px + 8, h * 0.86],
          [px + 4, h * 0.76],
          [px - 4, h * 0.76],
        ],
        NEAR,
      );
      disc(px, h * 0.73, 8, NEAR);
      break;
    }
    case "spiral": {
      rect(0, h * 0.82, w, h * 0.18, FAR);
      ground(h * 0.94);
      const cx = w * 0.5;
      const cy = h * 0.5;
      const pts: [number, number][] = [];
      for (let t = 0; t < Math.PI * 4.2; t += 0.08) {
        const r = h * 0.012 * t * t * 0.55 + h * 0.02;
        pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
      }
      line(pts, NEAR, 2);
      disc(cx, cy, h * 0.07, GROUND);
      break;
    }
    case "tree": {
      band(ctx, w, h, smooth(rnd, w, h * 0.84, h * 0.02, 2), FAR);
      ground(h * 0.93);
      const tx = w * 0.45;
      rect(tx - 10, h * 0.93 - unit * 0.43, 20, unit * 0.43, NEAR);
      disc(tx, h * 0.93 - unit * 0.43, unit * 0.16, MID);
      disc(tx - unit * 0.13, h * 0.93 - unit * 0.35, unit * 0.12, MID);
      disc(tx + unit * 0.14, h * 0.93 - unit * 0.36, unit * 0.13, MID);
      for (const k of [-1, -0.4, 0.4, 1])
        line(
          [
            [tx, h * 0.93],
            [tx + k * w * 0.02, h * 0.98],
            [tx + k * w * 0.055, h],
          ],
          NEAR,
          2,
        );
      break;
    }
    case "scatter": {
      ground(h * 0.95);
      const y0 = h * 0.72;
      const slope = -h * 0.3;
      const pts: [number, number][] = [];
      for (let i = 0; i < 44; i++) {
        const t = i / 43;
        const x = w * (0.06 + t * 0.88);
        const y = y0 + slope * t + (rnd() - 0.5) * h * 0.12;
        pts.push([x, y]);
      }
      line(
        [
          [w * 0.04, y0 + h * 0.02],
          [w * 0.96, y0 + slope - h * 0.03],
        ],
        NEAR,
        2,
      );
      for (const [x, y] of pts) disc(x, y, 5, NEAR);
      const [ox, oy] = pts[Math.floor(pts.length * 0.8)];
      disc(ox, oy - h * 0.05, 6, RED);
      break;
    }
    case "tiles": {
      const vy = h * 0.6;
      rect(0, vy, w, h - vy, FAR);
      const rows = [0, 0.18, 0.4, 0.68, 1];
      const ys = rows.map((t) => vy + (h - vy) * t);
      for (const y of ys.slice(1, -1))
        line(
          [
            [0, y + (rnd() - 0.5) * 8],
            [w, y + (rnd() - 0.5) * 8],
          ],
          MID,
          2,
        );
      for (let i = -6; i <= 6; i++) {
        const jitter = (rnd() - 0.5) * w * 0.03;
        line(
          [
            [w * 0.5 + i * w * 0.05 + jitter, vy],
            [w * 0.5 + i * w * 0.19 + jitter * 3, h],
          ],
          MID,
          2,
        );
      }
      const k = 1 + Math.floor(rnd() * 5) - 3;
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
      break;
    }
  }
}
