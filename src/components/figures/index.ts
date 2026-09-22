import type { Figure } from "./palette";
import { Backprop } from "./backprop";
import { Merkle } from "./merkle";
import { WAL_PACE, Wal } from "./wal";

export { STAGE_H, STAGE_W } from "./palette";

export const FIGURES: Figure[] = [
  {
    caption: "Merkle tree. Each node hashes its two children, so a changed block only touches the path to the root.",
    duration: 9,
    pace: 1.15,
    View: Merkle,
  },
  {
    caption: "Write-ahead log. Every write reaches the log and fsync before the table. Lose power, replay the log.",
    duration: 11,
    pace: WAL_PACE,
    View: Wal,
  },
  {
    caption: "Backpropagation. The loss flows back through the network and each weight learns its share of the blame.",
    duration: 10,
    pace: 1.15,
    View: Backprop,
  },
];
