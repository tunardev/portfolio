import { describe, expect, test } from "bun:test";
import { EMPTY, FIRST, SECOND } from "./engine";
import { replay } from "./useFriendGame";

describe("replay rebuilds the board from the shared move list", () => {
  test("an empty list leaves an empty board with first to move", () => {
    const { board, last, turn, played } = replay([]);
    expect(board.every((row) => row.every((cell) => cell === EMPTY))).toBe(true);
    expect(last).toBeNull();
    expect(turn).toBe(FIRST);
    expect(played).toBe(0);
  });

  test("players alternate and the last move is reported", () => {
    const { board, last, turn, played } = replay([3, 3, 4]);
    expect(board[0][3]).toBe(FIRST);
    expect(board[1][3]).toBe(SECOND);
    expect(board[0][4]).toBe(FIRST);
    expect(last).toEqual([0, 4]);
    expect(turn).toBe(SECOND);
    expect(played).toBe(3);
  });

  test("a move into a full column is skipped without consuming a turn", () => {
    const overfilled = [0, 0, 0, 0, 0, 0, 0];
    const { turn, played } = replay(overfilled);
    expect(played).toBe(6);
    expect(turn).toBe(FIRST);
  });

  test("the turn after a skipped move matches the board, not the raw list length", () => {
    const { board, turn, played } = replay([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(played).toBe(7);
    expect(board[0][1]).toBe(FIRST);
    expect(turn).toBe(SECOND);
  });

  test("skipped moves never leave the board and the turn disagreeing", () => {
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
