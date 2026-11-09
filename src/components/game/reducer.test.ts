import { describe, expect, test } from "bun:test";
import { type Board, type Cell, COLS, EMPTY, FIRST, ROWS, SECOND, emptyBoard } from "./engine";
import type { Reply } from "./model";
import { type GameState, gameReducer, initialGame, isOver } from "./reducer";

const reply = (move: number, confidence: number, expectedReply = -1, sure = false): Reply => ({
  move,
  confidence,
  expectedReply,
  sure,
});

const withBoard = (board: Board, over: Partial<GameState> = {}): GameState => ({
  ...initialGame(),
  board,
  ...over,
});

const rowOf = (board: Board, row: number, cells: [number, Cell][]) => {
  for (const [col, cell] of cells) board[row][col] = cell;
  return board;
};

const drawBoard = () => {
  const board = emptyBoard();
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      board[row][col] = (Math.floor(row / 2) + col) % 2 === 0 ? FIRST : SECOND;
    }
  }
  board[ROWS - 1][0] = EMPTY;
  return board;
};

describe("initialGame", () => {
  test("returns empty board with 0.5 confidence", () => {
    const state = initialGame();

    expect(state.board).toEqual(emptyBoard());
    expect(state.moves).toEqual([]);
    expect(state.confidence).toEqual([0.5]);
    expect(state.expected).toBe(-1);
    expect(state.last).toBeNull();
    expect(state.thinking).toBe(false);
    expect(state.sure).toBe(false);
  });
});

describe("gameReducer human action", () => {
  test("records move and sets thinking", () => {
    const next = gameReducer(initialGame(), { type: "human", col: 3 });

    expect(next.moves).toEqual([3]);
    expect(next.last).toEqual([0, 3]);
    expect(next.board[0][3]).toBe(FIRST);
    expect(next.thinking).toBe(true);
    expect(next.confidence).toEqual([0.5]);
  });

  test("stacks onto highest filled cell", () => {
    const first = gameReducer(initialGame(), { type: "human", col: 2 });
    const second = gameReducer(first, { type: "model", reply: reply(2, 0.5) });
    const third = gameReducer(second, { type: "human", col: 2 });

    expect(third.last).toEqual([2, 2]);
    expect(third.board[2][2]).toBe(FIRST);
    expect(third.moves).toEqual([2, 2, 2]);
  });

  test("records floor confidence on human win", () => {
    const board = rowOf(emptyBoard(), 0, [
      [0, FIRST],
      [1, FIRST],
      [2, FIRST],
    ]);
    const next = gameReducer(withBoard(board), { type: "human", col: 3 });

    expect(next.thinking).toBe(false);
    expect(next.confidence).toEqual([0.5, 0.02]);
  });

  test("records 0.5 confidence on draw", () => {
    const next = gameReducer(withBoard(drawBoard()), { type: "human", col: 0 });

    expect(isOver(next.board)).toBe(true);
    expect(next.thinking).toBe(false);
    expect(next.confidence).toEqual([0.5, 0.5]);
  });
});

describe("gameReducer model action", () => {
  test("records reply and clears thinking", () => {
    const state = gameReducer(initialGame(), { type: "human", col: 3 });
    const next = gameReducer(state, { type: "model", reply: reply(4, 0.61, 2, true) });

    expect(next.moves).toEqual([3, 4]);
    expect(next.board[0][4]).toBe(SECOND);
    expect(next.last).toEqual([0, 4]);
    expect(next.expected).toBe(2);
    expect(next.sure).toBe(true);
    expect(next.thinking).toBe(false);
    expect(next.confidence).toEqual([0.5, 0.61]);
  });

  test("clamps confidence to bounds", () => {
    const thinking = withBoard(emptyBoard(), { thinking: true });
    const floor = gameReducer(thinking, { type: "model", reply: reply(0, 0) });
    const ceiling = gameReducer(thinking, { type: "model", reply: reply(0, 1) });

    expect(floor.confidence).toEqual([0.5, 0.03]);
    expect(ceiling.confidence).toEqual([0.5, 0.97]);
  });

  test("records ceiling confidence on model win", () => {
    const board = rowOf(emptyBoard(), 0, [
      [0, SECOND],
      [1, SECOND],
      [2, SECOND],
    ]);
    const next = gameReducer(withBoard(board, { thinking: true }), { type: "model", reply: reply(3, 0.5) });

    expect(next.confidence).toEqual([0.5, 0.98]);
  });
});

describe("gameReducer invalid actions", () => {
  test("ignores model reply after reset", () => {
    const thinking = gameReducer(initialGame(), { type: "human", col: 3 });
    const fresh = gameReducer(thinking, { type: "reset" });

    expect(gameReducer(fresh, { type: "model", reply: reply(4, 0.6) })).toBe(fresh);
  });

  test("ignores model reply into full column", () => {
    const board = emptyBoard();
    for (let row = 0; row < ROWS; row++) board[row][2] = row % 2 === 0 ? FIRST : SECOND;
    const state = withBoard(board, { thinking: true });

    expect(gameReducer(state, { type: "model", reply: reply(2, 0.6) })).toBe(state);
  });

  test("ignores human move into full column", () => {
    const board = emptyBoard();
    for (let row = 0; row < ROWS; row++) board[row][5] = row % 2 === 0 ? FIRST : SECOND;
    const state = withBoard(board);

    expect(gameReducer(state, { type: "human", col: 5 })).toBe(state);
  });

  test("ignores human move while thinking", () => {
    const thinking = gameReducer(initialGame(), { type: "human", col: 3 });

    expect(gameReducer(thinking, { type: "human", col: 2 })).toBe(thinking);
  });

  test("ignores human move after game over", () => {
    const board = rowOf(emptyBoard(), 0, [
      [0, SECOND],
      [1, SECOND],
      [2, SECOND],
      [3, SECOND],
    ]);
    const state = withBoard(board);

    expect(gameReducer(state, { type: "human", col: 6 })).toBe(state);
  });
});

describe("gameReducer immutability", () => {
  test("does not mutate state on human action", () => {
    const state = initialGame();
    const board = state.board;

    gameReducer(state, { type: "human", col: 3 });

    expect(state.board).toBe(board);
    expect(state.board).toEqual(emptyBoard());
    expect(state.moves).toEqual([]);
    expect(state.last).toBeNull();
  });

  test("does not mutate state on model action", () => {
    const state = gameReducer(initialGame(), { type: "human", col: 3 });
    const before = state.board.map((row) => [...row]);

    gameReducer(state, { type: "model", reply: reply(4, 0.6) });

    expect(state.board).toEqual(before);
    expect(state.moves).toEqual([3]);
    expect(state.confidence).toEqual([0.5]);
  });
});

describe("gameReducer reset action", () => {
  test("returns initial state", () => {
    const played = gameReducer(gameReducer(initialGame(), { type: "human", col: 3 }), {
      type: "model",
      reply: reply(4, 0.7, 1, true),
    });

    expect(gameReducer(played, { type: "reset" })).toEqual(initialGame());
  });
});

describe("isOver", () => {
  test("returns false for game in progress", () => {
    expect(isOver(emptyBoard())).toBe(false);
    expect(isOver(gameReducer(initialGame(), { type: "human", col: 3 }).board)).toBe(false);
  });

  test("returns true on win", () => {
    const board = rowOf(emptyBoard(), 0, [
      [0, FIRST],
      [1, FIRST],
      [2, FIRST],
      [3, FIRST],
    ]);

    expect(isOver(board)).toBe(true);
  });

  test("returns true on full board", () => {
    const board = drawBoard();
    board[ROWS - 1][0] = SECOND;

    expect(isOver(board)).toBe(true);
  });
});
