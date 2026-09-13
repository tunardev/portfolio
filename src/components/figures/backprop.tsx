import type { ReactNode } from "react";
import { type Figure, INK, RED, PAPER, ink, red, clamp01 } from "./palette";
import { Label } from "./shared";

export const backprop: Figure = (() => {
  const layers = [3, 4, 4, 2];
  const xs = [105, 245, 385, 525];
  const MID = 100;
  const GAP = 50;
  const pos = layers.map((n, l) =>
    Array.from({ length: n }, (_, i) => ({ x: xs[l], y: MID - ((n - 1) * GAP) / 2 + i * GAP })),
  );
  const STEP = 3.2;
  const losses = [0.42, 0.31, 0.24, 0.19];

  return {
    caption: "Backpropagation. The loss flows back through the network and each weight learns its share of the blame.",
    duration: 10,
    pace: 1.15,
    View({ t }) {
      const step = Math.min(3, Math.floor(t / STEP));
      const u = step >= 3 ? 99 : t - step * STEP;
      const fwd = clamp01(u / 1.2);
      const bwd = clamp01((u - 1.4) / 1.2);
      const forward: ReactNode[] = [];
      const backward: ReactNode[] = [];
      for (let l = 0; l < 3; l++) {
        const lit = fwd * 3 >= l + 1;
        const reach = bwd > 0 ? bwd * 3 - (2 - l) : 0;
        const alpha = [0.16, 0.38, 0.7][l] * clamp01(reach);
        pos[l].forEach((a, i) => {
          pos[l + 1].forEach((b, j) => {
            const d = `M${a.x} ${a.y} L${b.x} ${b.y}`;
            forward.push(<path key={`${l}-${i}-${j}`} d={d} stroke={ink(lit ? 0.16 : 0.08)} />);
            if (reach > 0)
              backward.push(
                <path key={`${l}-${i}-${j}`} d={d} stroke={red(alpha)} strokeWidth={l === 2 ? 1.4 : 1.1} />,
              );
          });
        });
      }
      const shown = step >= 3 ? losses[3] : bwd >= 1 ? losses[step + 1] : losses[step];
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
              <path d={`M531 ${MID} L567 ${MID}`} stroke={red(0.7)} strokeWidth={1.4} />
              <circle cx={575} cy={MID} r={5} fill={RED} />
              <Label x={555} y={MID + 58} color={RED} anchor="middle">
                loss {shown.toFixed(2)}
              </Label>
            </g>
          )}
        </g>
      );
    },
  };
})();
