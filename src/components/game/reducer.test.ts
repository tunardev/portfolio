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
  test("starts from an empty board with an even confidence reading", () => {
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

describe("human moves", () => {
  test("records the column, the landing cell and hands the turn to the model", () => {
    const next = gameReducer(initialGame(), { type: "human", col: 3 });

    expect(next.moves).toEqual([3]);
    expect(next.last).toEqual([0, 3]);
    expect(next.board[0][3]).toBe(FIRST);
    expect(next.thinking).toBe(true);
    expect(next.confidence).toEqual([0.5]);
  });

  test("stacks onto the highest filled cell of the column", () => {
    const first = gameReducer(initialGame(), { type: "human", col: 2 });
    const second = gameReducer(first, { type: "model", reply: reply(2, 0.5) });
    const third = gameReducer(second, { type: "human", col: 2 });

    expect(third.last).toEqual([2, 2]);
    expect(third.board[2][2]).toBe(FIRST);
    expect(third.moves).toEqual([2, 2, 2]);
  });

  test("a winning drop stops the thinking and records the human floor", () => {
    const board = rowOf(emptyBoard(), 0, [
      [0, FIRST],
      [1, FIRST],
      [2, FIRST],
    ]);
    const next = gameReducer(withBoard(board), { type: "human", col: 3 });

    expect(next.thinking).toBe(false);
    expect(next.confidence).toEqual([0.5, 0.02]);
  });

  test("a drop that fills the last cell without a line records an even draw", () => {
    const next = gameReducer(withBoard(drawBoard()), { type: "human", col: 0 });

    expect(isOver(next.board)).toBe(true);
    expect(next.thinking).toBe(false);
    expect(next.confidence).toEqual([0.5, 0.5]);
  });
});

describe("model moves", () => {
  test("records the reply column, its expectation and clears the thinking flag", () => {
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

  test("clamps confidence to the floor and the ceiling", () => {
    const thinking = withBoard(emptyBoard(), { thinking: true });
    const floor = gameReducer(thinking, { type: "model", reply: reply(0, 0) });
    const ceiling = gameReducer(thinking, { type: "model", reply: reply(0, 1) });

    expect(floor.confidence).toEqual([0.5, 0.03]);
    expect(ceiling.confidence).toEqual([0.5, 0.97]);
  });

  test("a winning reply records the model ceiling above the clamp", () => {
    const board = rowOf(emptyBoard(), 0, [
      [0, SECOND],
      [1, SECOND],
      [2, SECOND],
    ]);
    const next = gameReducer(withBoard(board, { thinking: true }), { type: "model", reply: reply(3, 0.5) });

    expect(next.confidence).toEqual([0.5, 0.98]);
  });
});

describe("moves that do not belong to the current game are ignored", () => {
  test("a model reply that lands after a reset", () => {
    const thinking = gameReducer(initialGame(), { type: "human", col: 3 });
    const fresh = gameReducer(thinking, { type: "reset" });

    expect(gameReducer(fresh, { type: "model", reply: reply(4, 0.6) })).toBe(fresh);
  });

  test("a model reply into a full column", () => {
    const board = emptyBoard();
    for (let row = 0; row < ROWS; row++) board[row][2] = row % 2 === 0 ? FIRST : SECOND;
    const state = withBoard(board, { thinking: true });

    expect(gameReducer(state, { type: "model", reply: reply(2, 0.6) })).toBe(state);
  });

  test("a human drop into a full column", () => {
    const board = emptyBoard();
    for (let row = 0; row < ROWS; row++) board[row][5] = row % 2 === 0 ? FIRST : SECOND;
    const state = withBoard(board);

    expect(gameReducer(state, { type: "human", col: 5 })).toBe(state);
  });

  test("a human drop while the model is thinking", () => {
    const thinking = gameReducer(initialGame(), { type: "human", col: 3 });

    expect(gameReducer(thinking, { type: "human", col: 2 })).toBe(thinking);
  });

  test("a human drop once the game is over", () => {
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

describe("purity", () => {
  test("a human move leaves the previous state and its board untouched", () => {
    const state = initialGame();
    const board = state.board;

    gameReducer(state, { type: "human", col: 3 });

    expect(state.board).toBe(board);
    expect(state.board).toEqual(emptyBoard());
    expect(state.moves).toEqual([]);
    expect(state.last).toBeNull();
  });

  test("a model move leaves the previous state and its board untouched", () => {
    const state = gameReducer(initialGame(), { type: "human", col: 3 });
    const before = state.board.map((row) => [...row]);

    gameReducer(state, { type: "model", reply: reply(4, 0.6) });

    expect(state.board).toEqual(before);
    expect(state.moves).toEqual([3]);
    expect(state.confidence).toEqual([0.5]);
  });
});

describe("reset", () => {
  test("returns a fresh game", () => {
    const played = gameReducer(gameReducer(initialGame(), { type: "human", col: 3 }), {
      type: "model",
      reply: reply(4, 0.7, 1, true),
    });

    expect(gameReducer(played, { type: "reset" })).toEqual(initialGame());
  });
});

describe("isOver", () => {
  test("is false for an empty board and for a board still in play", () => {
    expect(isOver(emptyBoard())).toBe(false);
    expect(isOver(gameReducer(initialGame(), { type: "human", col: 3 }).board)).toBe(false);
  });

  test("is true once a line is on the board", () => {
    const board = rowOf(emptyBoard(), 0, [
      [0, FIRST],
      [1, FIRST],
      [2, FIRST],
      [3, FIRST],
    ]);

    expect(isOver(board)).toBe(true);
  });

  test("is true once the board is full", () => {
    const board = drawBoard();
    board[ROWS - 1][0] = SECOND;

    expect(isOver(board)).toBe(true);
  });
});
