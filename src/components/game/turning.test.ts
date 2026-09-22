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

  test("never names a turning point in a drawn game", () => {
    expect(findTurning([0.5, 0.9, 0.2, 0.5], EMPTY, [3, 3, 2, 2, 4, 4])).toBeNull();
  });

  test("finds the biggest drop when the human won", () => {
    const turning = findTurning([0.5, 0.6, 0.2, 0.25, 0.1], FIRST, [3, 2, 5, 0, 1, 4, 6]);

    expect(turning).toEqual({ move: 2, ply: 3, column: 5 });
  });

  test("finds the biggest rise when the model won", () => {
    const turning = findTurning([0.5, 0.45, 0.9, 0.95], SECOND, [3, 2, 5, 1, 4, 6]);

    expect(turning).toEqual({ move: 2, ply: 3, column: 5 });
  });

  test("keeps the first of two equal swings", () => {
    const turning = findTurning([0.5, 0.2, 0.2, 0.5, 0.2], FIRST, [6, 5, 4, 3, 2, 1, 0]);

    expect(turning).toEqual({ move: 1, ply: 1, column: 6 });
  });

  test("credits the human move that opened the exchange, not the model's answer", () => {
    const moves = [0, 1, 2, 3, 4, 5, 6, 0, 1, 2];
    const turning = findTurning([0.5, 0.5, 0.5, 0.5, 0.9, 0.9], SECOND, moves);

    expect(turning?.move).toBe(4);
    expect(turning?.ply).toBe(7);
    expect(turning?.column).toBe(moves[6]);
  });

  test("a closing human win is credited to the winning drop", () => {
    const moves = [3, 3, 2, 2, 4];
    const turning = findTurning([0.5, 0.55, 0.6, 0.02], FIRST, moves);

    expect(turning).toEqual({ move: 3, ply: 5, column: 4 });
  });
});
