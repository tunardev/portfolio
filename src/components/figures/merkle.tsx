import { clamp01, easeOut, ink, PAPER, RED, red } from "./palette";
import { Label } from "./shared";

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
const RINGS_END = 8.4;

type Spot = { level: number; index: number; x: number };
type Edge = Spot & { parentX: number };

const NODES: Spot[] = levels.flatMap((row, level) => row.map((x, index) => ({ level, index, x })));
const EDGES: Edge[] = NODES.flatMap((node) =>
  node.level < 3 ? [{ ...node, parentX: levels[node.level + 1][node.index >> 1] }] : [],
);

const onPath = ({ level, index }: Spot) => path[level] === index;
const edgeHot = (edge: Edge, t: number) => onPath(edge) && t >= rippleAt[edge.level + 1];
const nodeHot = (node: Spot, t: number) => onPath(node) && t >= rippleAt[node.level];
const PATH_NODES = NODES.filter(onPath);

// hot edges go last so they paint over their cold neighbours
function edgesHotLast(t: number) {
  const cold: { edge: Edge; hot: boolean }[] = [];
  const hot: { edge: Edge; hot: boolean }[] = [];
  for (const edge of EDGES) {
    if (edgeHot(edge, t)) hot.push({ edge, hot: true });
    else cold.push({ edge, hot: false });
  }
  return [...cold, ...hot];
}

function nodePaint(level: number, hot: boolean) {
  if (hot && level === 0) return { fill: RED, stroke: "none", strokeWidth: 0 };
  if (hot) return { fill: red(0.12), stroke: RED, strokeWidth: 1.3 };
  return { fill: level === 0 ? ink(0.08) : PAPER, stroke: ink(0.45), strokeWidth: 1 };
}

function EdgeLine({ edge, hot }: { edge: Edge; hot: boolean }) {
  return (
    <line
      x1={edge.x}
      y1={ys[edge.level]}
      x2={edge.parentX}
      y2={ys[edge.level + 1] + NH}
      stroke={hot ? red(0.7) : ink(0.22)}
      strokeWidth={hot ? 1.4 : 1}
      strokeLinecap="round"
    />
  );
}

function Ring({ node, t }: { node: Spot; t: number }) {
  const age = t - walkAt[3 - node.level];
  if (age < 0 || t >= RINGS_END) return null;
  const r = 14 + easeOut(age / 0.6) * 6;
  return (
    <ellipse
      cx={node.x}
      cy={ys[node.level] + NH / 2}
      rx={r + 8}
      ry={r}
      fill="none"
      stroke={ink(0.35 * (1 - clamp01(age / 1.6)))}
    />
  );
}

export function Merkle({ t }: { t: number }) {
  return (
    <g fill="none">
      {edgesHotLast(t).map(({ edge, hot }) => (
        <EdgeLine key={`${edge.level}-${edge.index}`} edge={edge} hot={hot} />
      ))}
      {NODES.map((node) => (
        <rect
          key={`${node.level}-${node.index}`}
          x={node.x - NW / 2}
          y={ys[node.level]}
          width={NW}
          height={NH}
          rx={3}
          {...nodePaint(node.level, nodeHot(node, t))}
        />
      ))}
      {PATH_NODES.map((node) => (
        <Ring key={`r${node.level}`} node={node} t={t} />
      ))}
      {t >= rippleAt[3] && (
        <Label x={lv3[0] + 26} y={ys[3] + NH / 2} color={RED}>
          root
        </Label>
      )}
    </g>
  );
}
