import type { ReactNode } from "react";
import { type Figure, RED, PAPER, ink, red, clamp01, easeOut } from "./palette";
import { Label } from "./shared";

export const merkle: Figure = (() => {
  const leaves = Array.from({ length: 8 }, (_, i) => 95 + i * 70);
  const lv1 = [0, 2, 4, 6].map((i) => (leaves[i] + leaves[i + 1]) / 2);
  const lv2 = [0, 2].map((i) => (lv1[i] + lv1[i + 1]) / 2);
  const lv3 = [(lv2[0] + lv2[1]) / 2];
  const levels = [leaves, lv1, lv2, lv3];
  const ys = [200, 138, 76, 14];
  const NW = 30;
  const NH = 18;
  const changed = 4;
  const path = [changed, changed >> 1, changed >> 2, 0];
  const rippleAt = [1.0, 1.8, 2.6, 3.4];
  const walkAt = [4.6, 5.4, 6.2, 7.0];

  return {
    caption: "Merkle tree. Each node hashes its two children, so a changed block only touches the path to the root.",
    duration: 9,
    pace: 1.15,
    View({ t }) {
      const edges: ReactNode[] = [];
      const hotEdges: ReactNode[] = [];
      for (let L = 0; L < 3; L++) {
        levels[L].forEach((x, i) => {
          const px = levels[L + 1][i >> 1];
          const hot = path[L] === i && t >= rippleAt[L + 1];
          const el = (
            <path
              key={`${L}-${i}`}
              d={`M${x} ${ys[L]} L${px} ${ys[L + 1] + NH}`}
              stroke={hot ? red(0.7) : ink(0.22)}
              strokeWidth={hot ? 1.4 : 1}
              strokeLinecap="round"
            />
          );
          (hot ? hotEdges : edges).push(el);
        });
      }
      const nodes: ReactNode[] = [];
      const rings: ReactNode[] = [];
      for (let L = 0; L < 4; L++) {
        levels[L].forEach((x, i) => {
          const onPath = path[L] === i;
          const hot = onPath && t >= rippleAt[L];
          const walked = onPath && t >= walkAt[3 - L];
          const props =
            L === 0 && hot
              ? { fill: RED, stroke: "none", strokeWidth: 0 }
              : hot
                ? { fill: red(0.12), stroke: RED, strokeWidth: 1.3 }
                : { fill: L === 0 ? ink(0.08) : PAPER, stroke: ink(0.45), strokeWidth: 1 };
          nodes.push(<rect key={`${L}-${i}`} x={x - NW / 2} y={ys[L]} width={NW} height={NH} rx={3} {...props} />);
          if (walked && t < 8.4) {
            const age = t - walkAt[3 - L];
            const r = 14 + easeOut(age / 0.6) * 6;
            rings.push(
              <ellipse
                key={`r${L}`}
                cx={x}
                cy={ys[L] + NH / 2}
                rx={r + 8}
                ry={r}
                fill="none"
                stroke={ink(0.35 * (1 - clamp01(age / 1.6)))}
              />,
            );
          }
        });
      }
      return (
        <g fill="none">
          {edges}
          {hotEdges}
          {nodes}
          {rings}
          {t >= rippleAt[3] && (
            <Label x={lv3[0] + 26} y={ys[3] + NH / 2} color={RED}>
              root
            </Label>
          )}
        </g>
      );
    },
  };
})();
