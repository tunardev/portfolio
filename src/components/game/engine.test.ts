import { describe, expect, test } from "bun:test";
import {
  COLS,
  EMPTY,
  FIRST,
  ROWS,
  SECOND,
  TOP_ROW,
  type Board,
  type Player,
  drop,
  emptyBoard,
  hasRoom,
  isFull,
  legalMoves,
  opponent,
  scoreMoves,
  think,
  winProbability,
  winner,
  winningCells,
} from "./engine";

function place(cells: [number, number, Player][]): Board {
  const board = emptyBoard();
  for (const [row, col, player] of cells) board[row][col] = player;
  return board;
}

function play(moves: [number, Player][]): Board {
  const board = emptyBoard();
  for (const [col, player] of moves) drop(board, col, player);
  return board;
}

function packedBoard(): Board {
  const board = emptyBoard();
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) board[row][col] = (row + col) % 2 === 0 ? FIRST : SECOND;
  }
  return board;
}

describe("winner", () => {
  test("sees four in a row across a single row", () => {
    const board = place([
      [0, 0, FIRST],
      [0, 1, FIRST],
      [0, 2, FIRST],
      [0, 3, FIRST],
    ]);
    expect(winner(board)).toBe(FIRST);
  });

  test("sees four stacked in a single column", () => {
    const board = place([
      [0, 2, SECOND],
      [1, 2, SECOND],
      [2, 2, SECOND],
      [3, 2, SECOND],
    ]);
    expect(winner(board)).toBe(SECOND);
  });

  test("sees four on the rising diagonal", () => {
    const board = place([
      [0, 0, FIRST],
      [1, 1, FIRST],
      [2, 2, FIRST],
      [3, 3, FIRST],
    ]);
    expect(winner(board)).toBe(FIRST);
  });

  test("sees four on the falling diagonal", () => {
    const board = place([
      [0, 3, SECOND],
      [1, 2, SECOND],
      [2, 1, SECOND],
      [3, 0, SECOND],
    ]);
    expect(winner(board)).toBe(SECOND);
  });

  test("does not see a win that wraps across a row edge", () => {
    const board = place([
      [0, 5, FIRST],
      [0, 6, FIRST],
      [1, 0, FIRST],
      [1, 1, FIRST],
    ]);
    expect(winner(board)).toBe(EMPTY);
    expect(winningCells(board)).toEqual([]);
  });

  test("reports nobody on an empty board", () => {
    expect(winner(emptyBoard())).toBe(EMPTY);
  });

  test("reports nobody for a run of only three", () => {
    const board = place([
      [0, 0, FIRST],
      [0, 1, FIRST],
      [0, 2, FIRST],
    ]);
    expect(winner(board)).toBe(EMPTY);
  });
});

describe("winningCells", () => {
  test("returns exactly the four cells held by the winner", () => {
    const board = place([
      [0, 1, SECOND],
      [1, 2, SECOND],
      [2, 3, SECOND],
      [3, 4, SECOND],
    ]);
    const cells = winningCells(board);

    expect(cells).toHaveLength(4);
    for (const [row, col] of cells) expect(board[row][col]).toBe(SECOND);
    expect(cells).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
  });

  test("returns an empty list when nobody has won", () => {
    expect(winningCells(emptyBoard())).toEqual([]);
  });

  test("walks a falling diagonal from its lowest cell", () => {
    const board = place([
      [0, 6, FIRST],
      [1, 5, FIRST],
      [2, 4, FIRST],
      [3, 3, FIRST],
    ]);

    expect(winningCells(board)).toEqual([
      [0, 6],
      [1, 5],
      [2, 4],
      [3, 3],
    ]);
  });
});

describe("drop", () => {
  test("stacks upward from row zero and returns the landing row", () => {
    const board = emptyBoard();

    expect(drop(board, 2, FIRST)).toBe(0);
    expect(drop(board, 2, SECOND)).toBe(1);
    expect(drop(board, 2, FIRST)).toBe(2);
    expect(board[0][2]).toBe(FIRST);
    expect(board[1][2]).toBe(SECOND);
    expect(board[2][2]).toBe(FIRST);
    expect(board[3][2]).toBe(EMPTY);
  });

  test("returns minus one once the column is full", () => {
    const board = emptyBoard();
    for (let i = 0; i < ROWS; i++) expect(drop(board, 5, FIRST)).toBe(i);
    expect(drop(board, 5, SECOND)).toBe(-1);
  });
});

describe("hasRoom", () => {
  test("is true for an untouched column and false once it is full", () => {
    const board = emptyBoard();
    expect(hasRoom(board, 4)).toBe(true);

    for (let i = 0; i < ROWS; i++) drop(board, 4, FIRST);
    expect(hasRoom(board, 4)).toBe(false);
  });

  test("is false for column indices outside the board", () => {
    const board = emptyBoard();
    expect(hasRoom(board, -1)).toBe(false);
    expect(hasRoom(board, COLS)).toBe(false);
    expect(hasRoom(board, COLS + 3)).toBe(false);
  });
});

describe("isFull", () => {
  test("is true when every slot is taken", () => {
    expect(isFull(packedBoard())).toBe(true);
  });

  test("is false while one slot remains", () => {
    const board = packedBoard();
    board[TOP_ROW][6] = EMPTY;
    expect(isFull(board)).toBe(false);
  });
});

describe("legalMoves", () => {
  test("lists every column centre out on an empty board", () => {
    expect(legalMoves(emptyBoard())).toEqual([3, 2, 4, 1, 5, 0, 6]);
  });

  test("omits columns that are already full", () => {
    const board = emptyBoard();
    for (let i = 0; i < ROWS; i++) drop(board, 3, i % 2 === 0 ? FIRST : SECOND);
    expect(legalMoves(board)).toEqual([2, 4, 1, 5, 0, 6]);
  });

  test("is empty on a packed board", () => {
    expect(legalMoves(packedBoard())).toEqual([]);
  });
});

describe("opponent", () => {
  test("swaps the two players", () => {
    expect(opponent(FIRST)).toBe(SECOND);
    expect(opponent(SECOND)).toBe(FIRST);
  });

  test("round trips back to the original player", () => {
    expect(opponent(opponent(FIRST))).toBe(FIRST);
    expect(opponent(opponent(SECOND))).toBe(SECOND);
  });
});

describe("winProbability", () => {
  test("is an even coin flip at a score of zero", () => {
    expect(winProbability(0)).toBeCloseTo(0.5, 10);
  });

  test("clamps to near certainty for a decided score", () => {
    expect(winProbability(900_000)).toBe(0.98);
    expect(winProbability(-900_000)).toBe(0.02);
  });

  test("rises with the score", () => {
    const probabilities = [-600, -200, -50, 0, 50, 200, 600].map(winProbability);
    for (let i = 1; i < probabilities.length; i++) {
      expect(probabilities[i]).toBeGreaterThan(probabilities[i - 1]);
    }
  });

  test("stays inside zero and one either side of the clamp", () => {
    expect(winProbability(400)).toBeGreaterThan(0.5);
    expect(winProbability(400)).toBeLessThan(1);
    expect(winProbability(-400)).toBeLessThan(0.5);
    expect(winProbability(-400)).toBeGreaterThan(0);
  });
});

describe("think", () => {
  test("takes the winning column when it holds three with one open end", () => {
    const board = play([
      [1, SECOND],
      [0, FIRST],
      [2, SECOND],
      [6, FIRST],
      [3, SECOND],
      [6, FIRST],
    ]);
    const analysis = think(board, SECOND, 4);

    expect(analysis.move).toBe(4);
    expect(analysis.score).toBeGreaterThan(100_000);
    expect(analysis.expectedReply).toBe(-1);
  });

  test("blocks the column where the opponent would win next move", () => {
    const board = play([
      [1, FIRST],
      [0, SECOND],
      [2, FIRST],
      [6, SECOND],
      [3, FIRST],
      [6, SECOND],
    ]);
    const analysis = think(board, SECOND, 4);

    expect(analysis.move).toBe(4);
    expect(legalMoves(board)).toContain(analysis.expectedReply);
  });

  test("picks a legal column on an empty board", () => {
    const analysis = think(emptyBoard(), SECOND, 3);
    expect(legalMoves(emptyBoard())).toContain(analysis.move);
  });

  test("leaves the board it was given untouched", () => {
    const board = play([
      [3, FIRST],
      [3, SECOND],
      [2, FIRST],
      [4, SECOND],
    ]);
    const before = board.map((row) => [...row]);

    think(board, FIRST, 4);
    scoreMoves(board, SECOND, 3);

    expect(board).toEqual(before);
  });

  test("the expected reply is the opponent's best answer to the chosen move", () => {
    const board = play([
      [3, FIRST],
      [3, SECOND],
    ]);
    const analysis = think(board, FIRST, 4);
    drop(board, analysis.move, FIRST);
    const replies = scoreMoves(board, SECOND, 1);
    const best = Math.max(...replies.map((reply) => reply.score));

    expect(replies.find((reply) => reply.score === best)?.col).toBe(analysis.expectedReply);
  });
});
