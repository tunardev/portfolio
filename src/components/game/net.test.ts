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
  test("returns one value per slot per plane", () => {
    expect(INPUTS).toBe(2 * SLOTS);
    expect(encode(emptyBoard(), FIRST)).toHaveLength(INPUTS);
  });

  test("returns zeros for empty board", () => {
    const planes = encode(emptyBoard(), FIRST);
    expect(Array.from(planes).every((value) => value === 0)).toBe(true);
  });

  test("encodes current player in first plane", () => {
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

  test("swaps planes for other player", () => {
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
  test("returns normalized priors on empty board", () => {
    const { priors } = predict(fakeNet(), emptyBoard(), FIRST);

    expect(priors).toHaveLength(COLS);
    expect(sum(priors)).toBeCloseTo(1, 10);
    expect(priors[3]).toBeCloseTo(Math.E / (6 + Math.E), 10);
    expect(priors[0]).toBeCloseTo(1 / (6 + Math.E), 10);
  });

  test("assigns zero prior to full column", () => {
    const { priors } = predict(fakeNet(), boardWithFullColumn(3), FIRST);

    expect(priors[3]).toBe(0);
    expect(sum(priors)).toBeCloseTo(1, 10);
    for (const col of [0, 1, 2, 4, 5, 6]) expect(priors[col]).toBeCloseTo(1 / 6, 10);
  });

  test("returns value within [-1, 1]", () => {
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

  test("computes value through hidden layer", () => {
    const board = emptyBoard();
    drop(board, 0, FIRST);

    expect(predict(fakeNet(), emptyBoard(), FIRST).value).toBeCloseTo(Math.tanh(0.5), 10);
    expect(predict(fakeNet(), board, SECOND).value).toBeCloseTo(Math.tanh(1.5), 10);
    expect(predict(fakeNet(), board, FIRST).value).toBeCloseTo(Math.tanh(0.5), 10);
  });
});

describe("isNet", () => {
  test("accepts valid network", () => {
    expect(isNet(fakeNet())).toBe(true);
  });

  test("accepts shipped weights", async () => {
    const shipped: unknown = await Bun.file(`${import.meta.dir}/../../../public/model/weights.json`).json();
    expect(isNet(shipped)).toBe(true);
  });

  test("rejects non-network values", () => {
    expect(isNet(null)).toBe(false);
    expect(isNet("weights")).toBe(false);
    expect(isNet({ ...fakeNet(), hidden: undefined })).toBe(false);
    expect(isNet({ ...fakeNet(), version: 3 })).toBe(false);
  });

  test("rejects mismatched hidden layer size", () => {
    const net = fakeNet();
    net.hidden[0].w = net.hidden[0].w.slice(1);
    expect(isNet(net)).toBe(false);
  });

  test("rejects policy head with missing columns", () => {
    const net = fakeNet();
    net.policy = { w: Array<number>((COLS - 1) * 2).fill(0), b: Array<number>(COLS - 1).fill(0) };
    expect(isNet(net)).toBe(false);
  });

  test("rejects multi-output value head", () => {
    const net = fakeNet();
    net.value = { w: [0, 1, 0, 1], b: [0, 0] };
    expect(isNet(net)).toBe(false);
  });

  test("rejects non-finite weights", () => {
    const net = fakeNet();
    (net.policy.b as unknown[])[2] = null;
    expect(isNet(net)).toBe(false);
  });
});

describe("choose", () => {
  test("returns legal move without mutating board", () => {
    const board = boardWithFullColumn(3);
    const before = board.map((row) => [...row]);
    const choice = choose(fakeNet(), board, FIRST, 3);

    expect(choice.move).not.toBe(3);
    expect(choice.move).toBeGreaterThanOrEqual(0);
    expect(board).toEqual(before);
  });

  test("plays immediate win", () => {
    const board = emptyBoard();
    for (const col of [0, 1, 2]) drop(board, col, SECOND);
    for (const col of [0, 1, 2]) drop(board, col, FIRST);

    expect(choose(fakeNet(), board, SECOND, 2).move).toBe(3);
  });
});
