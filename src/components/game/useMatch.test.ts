import { describe, expect, test } from "bun:test";
import { COLS } from "./engine";
import { isAhead, toSync } from "./useMatch";

const EMPTY_SYNC = { moves: [], round: 0 };

describe("toSync", () => {
  test("passes a well formed payload through", () => {
    expect(toSync({ moves: [3, 0, 6], round: 2 })).toEqual({ moves: [3, 0, 6], round: 2 });
  });

  test("keeps an empty move list alongside a real round", () => {
    expect(toSync({ moves: [], round: 4 })).toEqual({ moves: [], round: 4 });
  });

  test("ignores extra fields a peer tacks on", () => {
    expect(toSync({ moves: [1], round: 0, winner: "them", seat: "host" })).toEqual({ moves: [1], round: 0 });
  });

  test("falls back to an empty sync for values that are not payloads", () => {
    expect(toSync(null)).toEqual(EMPTY_SYNC);
    expect(toSync(undefined)).toEqual(EMPTY_SYNC);
    expect(toSync("moves")).toEqual(EMPTY_SYNC);
    expect(toSync(7)).toEqual(EMPTY_SYNC);
    expect(toSync(0)).toEqual(EMPTY_SYNC);
    expect(toSync([3, 0, 6])).toEqual(EMPTY_SYNC);
    expect(toSync(true)).toEqual(EMPTY_SYNC);
  });

  test("falls back to an empty sync when moves is not an array", () => {
    expect(toSync({ moves: "3,0,6", round: 1 })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: { 0: 3 }, round: 1 })).toEqual(EMPTY_SYNC);
    expect(toSync({ round: 1 })).toEqual(EMPTY_SYNC);
  });

  test("falls back to an empty sync when round is not a number", () => {
    expect(toSync({ moves: [3], round: "1" })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [3], round: null })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [3] })).toEqual(EMPTY_SYNC);
  });

  test("drops columns outside the board and keeps the valid ones", () => {
    expect(toSync({ moves: [-1, 0, COLS, 6, COLS + 4], round: 1 })).toEqual({ moves: [0, 6], round: 1 });
  });

  test("drops columns that are not whole numbers", () => {
    expect(toSync({ moves: [2.5, 3, Number.NaN, Number.POSITIVE_INFINITY, 4], round: 1 })).toEqual({
      moves: [3, 4],
      round: 1,
    });
  });

  test("drops moves that are not numbers at all", () => {
    expect(toSync({ moves: ["3", null, undefined, {}, [2], true, 5], round: 1 })).toEqual({ moves: [5], round: 1 });
  });
});

describe("isAhead", () => {
  test("a higher round always wins, however short its move list", () => {
    expect(isAhead({ moves: [], round: 2 }, { moves: [1, 2, 3, 4], round: 1 })).toBe(true);
    expect(isAhead({ moves: [1, 2, 3, 4], round: 1 }, { moves: [], round: 2 })).toBe(false);
  });

  test("at an equal round the longer move list wins", () => {
    expect(isAhead({ moves: [1, 2], round: 3 }, { moves: [1], round: 3 })).toBe(true);
    expect(isAhead({ moves: [1], round: 3 }, { moves: [1, 2], round: 3 })).toBe(false);
  });

  test("an identical round and length is not ahead", () => {
    expect(isAhead({ moves: [1, 2], round: 3 }, { moves: [4, 5], round: 3 })).toBe(false);
    expect(isAhead(EMPTY_SYNC, EMPTY_SYNC)).toBe(false);
  });
});

describe("toSync validates the round as strictly as the moves", () => {
  test("a fractional round is refused outright", () => {
    expect(toSync({ moves: [1, 2], round: 0.5 })).toEqual({ moves: [], round: 0 });
  });

  test("a negative round is refused outright", () => {
    expect(toSync({ moves: [1, 2], round: -3 })).toEqual({ moves: [], round: 0 });
  });

  test("a non-finite round is refused outright", () => {
    expect(toSync({ moves: [1], round: Number.NaN })).toEqual({ moves: [], round: 0 });
    expect(toSync({ moves: [1], round: Number.POSITIVE_INFINITY })).toEqual({ moves: [], round: 0 });
  });

  test("a whole non-negative round is accepted", () => {
    expect(toSync({ moves: [1], round: 0 })).toEqual({ moves: [1], round: 0 });
    expect(toSync({ moves: [1], round: 7 })).toEqual({ moves: [1], round: 7 });
  });

  test("an accepted round always decides colours consistently", () => {
    for (const round of [0, 1, 2, 3, 50, 99]) {
      const parsed = toSync({ moves: [], round });
      expect(Number.isInteger(parsed.round % 2)).toBe(true);
      expect([0, 1]).toContain(parsed.round % 2);
    }
  });
});
