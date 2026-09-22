import { EMPTY, FIRST, type Cell } from "./engine";

// move indexes the confidence series, which gains one reading per exchange; ply is the human move that opened it
export type Turning = { move: number; ply: number; column: number } | null;

export function findTurning(confidence: number[], result: Cell, moves: number[]): Turning {
  if (result === EMPTY || confidence.length < 3) return null;

  let turnedAt = 0;
  let biggestSwing = 0;
  for (let i = 1; i < confidence.length; i++) {
    const swing = result === FIRST ? confidence[i - 1] - confidence[i] : confidence[i] - confidence[i - 1];
    if (swing > biggestSwing) {
      biggestSwing = swing;
      turnedAt = i;
    }
  }

  if (turnedAt === 0) return null;
  const ply = 2 * turnedAt - 1;
  return { move: turnedAt, ply, column: moves[ply - 1] };
}
