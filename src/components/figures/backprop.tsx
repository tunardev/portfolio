import type { ReactNode } from "react";
import { clamp01, INK, ink, PAPER, RED, red } from "./palette";
import { Label } from "./shared";

const layers = [3, 4, 4, 2];
const xs = [105, 245, 385, 525];
const MID = 100;
const GAP = 50;
const pos = layers.map((n, l) =>
  Array.from({ length: n }, (_, i) => ({ x: xs[l], y: MID - ((n - 1) * GAP) / 2 + i * GAP })),
);
const STEP = 3.2;
const LAST_STEP = 3;
const losses = [0.42, 0.31, 0.24, 0.19];
const blameAlpha = [0.16, 0.38, 0.7];

export function Backprop({ t }: { t: number }) {
  const step = Math.min(LAST_STEP, Math.floor(t / STEP));
  const u = step >= LAST_STEP ? Number.POSITIVE_INFINITY : t - step * STEP;
  const fwd = clamp01(u / 1.2);
  const bwd = clamp01((u - 1.4) / 1.2);
  const forward: ReactNode[] = [];
  const backward: ReactNode[] = [];
  for (let l = 0; l < 3; l++) {
    const lit = fwd * 3 >= l + 1;
    const reach = bwd > 0 ? bwd * 3 - (2 - l) : 0;
    const alpha = blameAlpha[l] * clamp01(reach);
    pos[l].forEach((a, i) => {
      pos[l + 1].forEach((b, j) => {
        const ends = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
        forward.push(<line key={`${l}-${i}-${j}`} {...ends} stroke={ink(lit ? 0.16 : 0.08)} />);
        if (reach > 0) {
          backward.push(
            <line key={`${l}-${i}-${j}`} {...ends} stroke={red(alpha)} strokeWidth={l === 2 ? 1.4 : 1.1} />,
          );
        }
      });
    });
  }
  const shown = step >= LAST_STEP ? losses[LAST_STEP] : bwd >= 1 ? losses[step + 1] : losses[step];
  return (
    <g fill="none">
      {forward}
      {backward}
      {pos.map((layer, l) => {
        const lit = fwd * 3 >= l;
        return layer.map((n, i) => (
          <circle
            key={`${l}-${i}`}
            cx={n.x}
            cy={n.y}
            r={5}
            fill={l === 3 && fwd >= 1 ? INK : PAPER}
            stroke={lit ? INK : ink(0.35)}
            strokeWidth={1.3}
          />
        ));
      })}
      <Label x={105} y={MID + 102} anchor="middle">
        input
      </Label>
      <Label x={525} y={MID + 102} anchor="middle">
        output
      </Label>
      {fwd >= 1 && (
        <g>
          <line x1={531} y1={MID} x2={567} y2={MID} stroke={red(0.7)} strokeWidth={1.4} />
          <circle cx={575} cy={MID} r={5} fill={RED} />
          <Label x={555} y={MID + 58} color={RED} anchor="middle">
            loss {shown.toFixed(2)}
          </Label>
        </g>
      )}
    </g>
  );
}
