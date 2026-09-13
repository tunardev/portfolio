import { FIRST, type Cell } from "./engine";

export type Turning = { move: number; column: number } | null;

export function findTurning(confidence: number[], result: Cell, moves: number[]): Turning {
  if (confidence.length < 3) return null;

  let turnedAt = 0;
  let biggestSwing = 0;
  for (let i = 1; i < confidence.length; i++) {
    const swing = result === FIRST ? confidence[i - 1] - confidence[i] : confidence[i] - confidence[i - 1];
    if (swing > biggestSwing) {
      biggestSwing = swing;
      turnedAt = i;
    }
  }

  return turnedAt > 0 ? { move: turnedAt, column: moves[turnedAt - 1] } : null;
}
