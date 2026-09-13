import { describe, expect, test } from "bun:test";
import { EMPTY, FIRST, SECOND } from "./engine";
import { findTurning } from "./turning";

describe("findTurning", () => {
  test("returns null when there are fewer than three readings", () => {
    expect(findTurning([], FIRST, [])).toBeNull();
    expect(findTurning([0.5], FIRST, [])).toBeNull();
    expect(findTurning([0.5, 0.9], FIRST, [3])).toBeNull();
  });

  test("returns null for a flat game where nothing ever swings", () => {
    const flat = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const moves = [3, 3, 2, 4, 1];

    expect(findTurning(flat, FIRST, moves)).toBeNull();
    expect(findTurning(flat, SECOND, moves)).toBeNull();
    expect(findTurning(flat, EMPTY, moves)).toBeNull();
  });

  test("returns null when the series only moves against the winner", () => {
    expect(findTurning([0.5, 0.6, 0.7, 0.8], FIRST, [3, 2, 4])).toBeNull();
    expect(findTurning([0.8, 0.7, 0.6, 0.5], SECOND, [3, 2, 4])).toBeNull();
  });

  test("finds the biggest drop when the human won", () => {
    const turning = findTurning([0.5, 0.6, 0.2, 0.25, 0.1], FIRST, [3, 2, 5, 0]);

    expect(turning).toEqual({ move: 2, column: 2 });
  });

  test("finds the biggest rise when the model won", () => {
    const turning = findTurning([0.5, 0.45, 0.9, 0.95], SECOND, [3, 2, 5]);

    expect(turning).toEqual({ move: 2, column: 2 });
  });

  test("keeps the first of two equal swings", () => {
    const turning = findTurning([0.5, 0.2, 0.2, 0.5, 0.2], FIRST, [6, 5, 4, 3]);

    expect(turning).toEqual({ move: 1, column: 6 });
  });

  test("credits the move that caused the swing, not the one after it", () => {
    const moves = [0, 1, 2, 3, 4, 5];
    const turning = findTurning([0.5, 0.5, 0.5, 0.5, 0.9, 0.9], SECOND, moves);

    expect(turning?.move).toBe(4);
    expect(turning?.column).toBe(moves[3]);
    expect(turning?.column).toBe(3);
  });
});
