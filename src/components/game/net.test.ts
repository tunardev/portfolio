import { describe, expect, test } from "bun:test";
import { COLS, FIRST, ROWS, SECOND, SLOTS, type Board, drop, emptyBoard } from "./engine";
import { INPUTS, type Net, choose, encode, isNet, predict } from "./net";

function fakeNet(): Net {
  const hidden = Array<number>(2 * INPUTS).fill(0);
  hidden[0] = 1;
  hidden[INPUTS + SLOTS] = 1;

  return {
    version: "fake",
    trainedAt: "2026-01-01T00:00:00.000Z",
    gamesUsed: 0,
    positions: 0,
    hidden: [{ w: hidden, b: [0, 0.5] }],
    policy: { w: Array<number>(COLS * 2).fill(0), b: [0, 0, 0, 1, 0, 0, 0] },
    value: { w: [0, 1], b: [0] },
  };
}

function boardWithFullColumn(col: number): Board {
  const board = emptyBoard();
  for (let i = 0; i < ROWS; i++) drop(board, col, i % 2 === 0 ? FIRST : SECOND);
  return board;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

describe("encode", () => {
  test("produces one number per slot per plane", () => {
    expect(INPUTS).toBe(2 * SLOTS);
    expect(encode(emptyBoard(), FIRST)).toHaveLength(INPUTS);
  });

  test("is all zeros for an empty board", () => {
    const planes = encode(emptyBoard(), FIRST);
    expect(Array.from(planes).every((value) => value === 0)).toBe(true);
  });

  test("puts the side to move in the first plane and the opponent in the second", () => {
    const board = emptyBoard();
    drop(board, 0, FIRST);
    drop(board, 1, SECOND);

    const planes = encode(board, FIRST);
    expect(planes[0]).toBe(1);
    expect(planes[1]).toBe(0);
    expect(planes[SLOTS + 1]).toBe(1);
    expect(planes[SLOTS]).toBe(0);
    expect(sum(Array.from(planes))).toBe(2);
  });

  test("swaps the two planes when the other player is to move", () => {
    const board = emptyBoard();
    drop(board, 0, FIRST);
    drop(board, 1, SECOND);
    drop(board, 1, FIRST);

    const fromFirst = Array.from(encode(board, FIRST));
    const fromSecond = Array.from(encode(board, SECOND));

    expect(fromSecond.slice(0, SLOTS)).toEqual(fromFirst.slice(SLOTS));
    expect(fromSecond.slice(SLOTS)).toEqual(fromFirst.slice(0, SLOTS));
  });
});

describe("predict", () => {
  test("returns priors that sum to one on an empty board", () => {
    const { priors } = predict(fakeNet(), emptyBoard(), FIRST);

    expect(priors).toHaveLength(COLS);
    expect(sum(priors)).toBeCloseTo(1, 10);
    expect(priors[3]).toBeCloseTo(Math.E / (6 + Math.E), 10);
    expect(priors[0]).toBeCloseTo(1 / (6 + Math.E), 10);
  });

  test("gives a full column a prior of exactly zero and spreads the rest over the legal moves", () => {
    const { priors } = predict(fakeNet(), boardWithFullColumn(3), FIRST);

    expect(priors[3]).toBe(0);
    expect(sum(priors)).toBeCloseTo(1, 10);
    for (const col of [0, 1, 2, 4, 5, 6]) expect(priors[col]).toBeCloseTo(1 / 6, 10);
  });

  test("returns a value inside minus one and one", () => {
    const board = emptyBoard();
    drop(board, 0, FIRST);

    for (const [position, player] of [
      [emptyBoard(), FIRST],
      [board, FIRST],
      [board, SECOND],
    ] as [Board, typeof FIRST | typeof SECOND][]) {
      const { value } = predict(fakeNet(), position, player);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  test("reads the value head through the hidden layer", () => {
    const board = emptyBoard();
    drop(board, 0, FIRST);

    expect(predict(fakeNet(), emptyBoard(), FIRST).value).toBeCloseTo(Math.tanh(0.5), 10);
    expect(predict(fakeNet(), board, SECOND).value).toBeCloseTo(Math.tanh(1.5), 10);
    expect(predict(fakeNet(), board, FIRST).value).toBeCloseTo(Math.tanh(0.5), 10);
  });
});

describe("isNet", () => {
  test("accepts weights whose layers chain from the input planes to both heads", () => {
    expect(isNet(fakeNet())).toBe(true);
  });

  test("accepts the shipped weights", async () => {
    const shipped: unknown = await Bun.file(`${import.meta.dir}/../../../public/model/weights.json`).json();
    expect(isNet(shipped)).toBe(true);
  });

  test("rejects anything that is not an object with weights", () => {
    expect(isNet(null)).toBe(false);
    expect(isNet("weights")).toBe(false);
    expect(isNet({ ...fakeNet(), hidden: undefined })).toBe(false);
    expect(isNet({ ...fakeNet(), version: 3 })).toBe(false);
  });

  test("rejects a hidden layer sized for a different input", () => {
    const net = fakeNet();
    net.hidden[0].w = net.hidden[0].w.slice(1);
    expect(isNet(net)).toBe(false);
  });

  test("rejects a policy head that does not score every column", () => {
    const net = fakeNet();
    net.policy = { w: Array<number>((COLS - 1) * 2).fill(0), b: Array<number>(COLS - 1).fill(0) };
    expect(isNet(net)).toBe(false);
  });

  test("rejects a value head with more than one output", () => {
    const net = fakeNet();
    net.value = { w: [0, 1, 0, 1], b: [0, 0] };
    expect(isNet(net)).toBe(false);
  });

  test("rejects weights that are not finite numbers", () => {
    const net = fakeNet();
    (net.policy.b as unknown[])[2] = null;
    expect(isNet(net)).toBe(false);
  });
});

describe("choose", () => {
  test("picks a legal column and leaves the board it was given untouched", () => {
    const board = boardWithFullColumn(3);
    const before = board.map((row) => [...row]);
    const choice = choose(fakeNet(), board, FIRST, 3);

    expect(choice.move).not.toBe(3);
    expect(choice.move).toBeGreaterThanOrEqual(0);
    expect(board).toEqual(before);
  });

  test("takes an immediate win", () => {
    const board = emptyBoard();
    for (const col of [0, 1, 2]) drop(board, col, SECOND);
    for (const col of [0, 1, 2]) drop(board, col, FIRST);

    expect(choose(fakeNet(), board, SECOND, 2).move).toBe(3);
  });
});
