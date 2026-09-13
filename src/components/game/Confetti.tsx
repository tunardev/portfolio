import { useEffect, useRef } from "react";

const PALETTE = ["--red", "--tint-sage", "--tint-sky", "--tint-manila", "--tint-blush", "--tint-mint", "--ink"];
const FALLBACK_COLOR = "#d9472b";

const DURATION = 3200;
const SPAWN_WINDOW = 1000;
const PIECES = 220;
const GRAVITY = 260;
const SWAY = 40;
const FADE_AFTER = 2000;
const FADE_OVER = 800;
const MAX_STEP = 0.05;
const MAX_DPR = 2;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rotation: number;
  spin: number;
  color: string;
  wobble: number;
  born: number;
};

export function Confetti({ onDone }: { onDone?: () => void }) {
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      done.current?.();
    };

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      close();
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      close();
      return;
    }

    const theme = getComputedStyle(document.documentElement);
    const colors = PALETTE.map((token) => theme.getPropertyValue(token).trim() || FALLBACK_COLOR);

    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "50",
    });
    document.body.appendChild(canvas);

    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const viewWidth = () => canvas.width / dpr;
    const viewHeight = () => canvas.height / dpr;

    const pieces: Piece[] = [];
    const spawn = (now: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const size = 6 + Math.random() * 8;
        pieces.push({
          x: Math.random() * viewWidth(),
          y: -20 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 60,
          vy: 120 + Math.random() * 160,
          w: size,
          h: size * (0.5 + Math.random() * 0.7),
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          wobble: Math.random() * Math.PI * 2,
          born: now,
        });
      }
    };

    const start = performance.now();
    let previous = start;
    let spawned = 0;
    let raf = 0;

    const stop = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.remove();
      close();
    };

    const frame = (now: number) => {
      const step = Math.min(MAX_STEP, (now - previous) / 1000);
      previous = now;

      const elapsed = now - start;
      if (elapsed < SPAWN_WINDOW && spawned < PIECES) {
        const wanted = Math.floor((elapsed / SPAWN_WINDOW) * PIECES);
        spawn(now, wanted - spawned);
        spawned = wanted;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewWidth(), viewHeight());

      for (const piece of pieces) {
        piece.vy += GRAVITY * step;
        piece.vx += Math.sin(piece.wobble + (now - piece.born) / 180) * SWAY * step;
        piece.x += piece.vx * step;
        piece.y += piece.vy * step;
        piece.rotation += piece.spin * step;

        const age = now - piece.born;
        const alpha = age > FADE_AFTER ? Math.max(0, 1 - (age - FADE_AFTER) / FADE_OVER) : 1;
        if (alpha <= 0) continue;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.cos((now - piece.born) / 140 + piece.wobble)));
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        ctx.restore();
      }

      if (elapsed < DURATION) raf = requestAnimationFrame(frame);
      else stop();
    };

    raf = requestAnimationFrame(frame);
    return stop;
  }, []);

  return null;
}
