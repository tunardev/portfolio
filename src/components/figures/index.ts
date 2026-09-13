import type { Figure } from "./palette";
import { merkle } from "./merkle";
import { wal } from "./wal";
import { backprop } from "./backprop";

export { STAGE_W, STAGE_H, type Figure } from "./palette";
export const FIGURES: Figure[] = [merkle, wal, backprop];
