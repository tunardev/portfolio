import { describe, expect, test } from "bun:test";
import { EMPTY, FIRST, SECOND } from "./engine";
import { replay } from "./useFriendGame";

describe("replay", () => {
  test("returns empty board for empty moves", () => {
    const { board, last, turn, played } = replay([]);
    expect(board.every((row) => row.every((cell) => cell === EMPTY))).toBe(true);
    expect(last).toBeNull();
    expect(turn).toBe(FIRST);
    expect(played).toBe(0);
  });

  test("alternates players and returns last move", () => {
    const { board, last, turn, played } = replay([3, 3, 4]);
    expect(board[0][3]).toBe(FIRST);
    expect(board[1][3]).toBe(SECOND);
    expect(board[0][4]).toBe(FIRST);
    expect(last).toEqual([0, 4]);
    expect(turn).toBe(SECOND);
    expect(played).toBe(3);
  });

  test("skips full-column move without consuming turn", () => {
    const overfilled = [0, 0, 0, 0, 0, 0, 0];
    const { turn, played } = replay(overfilled);
    expect(played).toBe(6);
    expect(turn).toBe(FIRST);
  });

  test("derives turn from board after skipped move", () => {
    const { board, turn, played } = replay([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(played).toBe(7);
    expect(board[0][1]).toBe(FIRST);
    expect(turn).toBe(SECOND);
  });

  test("keeps turn consistent with board", () => {
    for (const moves of [
      [0, 0, 0, 0, 0, 0, 0],
      [2, 2, 2, 2, 2, 2, 2, 2, 3],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ]) {
      const { board, turn } = replay(moves);
      const placed = board.flat().filter((cell) => cell !== EMPTY).length;
      expect(turn).toBe(placed % 2 === 0 ? FIRST : SECOND);
    }
  });
});
