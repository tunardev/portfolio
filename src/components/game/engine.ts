export const COLS = 7;
export const ROWS = 6;
export const SLOTS = ROWS * COLS;
export const TOP_ROW = ROWS - 1;

export const EMPTY = 0;
export const FIRST = 1;
export const SECOND = 2;

export type Player = typeof FIRST | typeof SECOND;
export type Cell = typeof EMPTY | Player;
export type Board = Cell[][];

const CONNECT = 4;
const CENTER_COL = 3;
const CENTER_BONUS = 5;
const CENTER_OUT = [3, 2, 4, 1, 5, 0, 6];
const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const DECIDED = 1_000_000;
const REPLY_DEPTH_DROP = 3;
const CONFIDENCE_SCALE = 120;

export function opponent(player: Player): Player {
  return player === FIRST ? SECOND : FIRST;
}

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(EMPTY));
}

export function clone(board: Board): Board {
  return board.map((row) => [...row]);
}

export function hasRoom(board: Board, col: number) {
  return col >= 0 && col < COLS && board[TOP_ROW][col] === EMPTY;
}

export function legalMoves(board: Board): number[] {
  return CENTER_OUT.filter((col) => hasRoom(board, col));
}

export function drop(board: Board, col: number, player: Player): number {
  for (let row = 0; row < ROWS; row++) {
    if (board[row][col] === EMPTY) {
      board[row][col] = player;
      return row;
    }
  }
  return -1;
}

export function isFull(board: Board) {
  return board[TOP_ROW].every((cell) => cell !== EMPTY);
}

function runFrom(board: Board, row: number, col: number, dRow: number, dCol: number, limit: number) {
  const player = board[row][col];
  const cells: [number, number][] = [[row, col]];
  let r = row + dRow;
  let c = col + dCol;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player && cells.length < limit) {
    cells.push([r, c]);
    r += dRow;
    c += dCol;
  }
  return cells;
}

export function winner(board: Board): Cell {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === EMPTY) continue;
      for (const [dRow, dCol] of DIRECTIONS) {
        if (runFrom(board, row, col, dRow, dCol, CONNECT).length === CONNECT) return board[row][col];
      }
    }
  }
  return EMPTY;
}

export function winningCells(board: Board): [number, number][] {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === EMPTY) continue;
      for (const [dRow, dCol] of DIRECTIONS) {
        const run = runFrom(board, row, col, dRow, dCol, CONNECT);
        if (run.length === CONNECT) return run;
      }
    }
  }
  return [];
}

function scoreWindow(cells: Cell[], me: Player): number {
  const them = opponent(me);
  const mine = cells.filter((cell) => cell === me).length;
  const theirs = cells.filter((cell) => cell === them).length;
  const empty = cells.filter((cell) => cell === EMPTY).length;

  if (mine === CONNECT) return 100_000;
  if (theirs === CONNECT) return -100_000;
  if (mine === 3 && empty === 1) return 60;
  if (mine === 2 && empty === 2) return 8;
  if (theirs === 3 && empty === 1) return -70;
  if (theirs === 2 && empty === 2) return -9;
  return 0;
}

function evaluateForSecond(board: Board): number {
  let score = 0;
  for (let row = 0; row < ROWS; row++) if (board[row][CENTER_COL] === SECOND) score += CENTER_BONUS;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (const [dRow, dCol] of DIRECTIONS) {
        const endRow = row + (CONNECT - 1) * dRow;
        const endCol = col + (CONNECT - 1) * dCol;
        if (endRow < 0 || endRow >= ROWS || endCol < 0 || endCol >= COLS) continue;
        const window = Array.from({ length: CONNECT }, (_, i) => board[row + i * dRow][col + i * dCol]);
        score += scoreWindow(window, SECOND);
      }
    }
  }

  return score;
}

function negamax(board: Board, depth: number, alpha: number, beta: number, player: Player): number {
  const won = winner(board);
  if (won === player) return DECIDED + depth;
  if (won !== EMPTY) return -DECIDED - depth;
  if (isFull(board)) return 0;
  if (depth === 0) return player === SECOND ? evaluateForSecond(board) : -evaluateForSecond(board);

  let best = -Infinity;
  for (const col of legalMoves(board)) {
    const next = clone(board);
    drop(next, col, player);
    best = Math.max(best, -negamax(next, depth - 1, -beta, -alpha, opponent(player)));
    alpha = Math.max(alpha, best);
    if (alpha >= beta) break;
  }
  return best;
}

export type MoveScore = { col: number; score: number };

export type Analysis = {
  move: number;
  score: number;
  expectedReply: number;
};

export function scoreMoves(board: Board, player: Player, depth: number): MoveScore[] {
  return legalMoves(board).map((col) => {
    const next = clone(board);
    drop(next, col, player);
    return { col, score: -negamax(next, depth - 1, -Infinity, Infinity, opponent(player)) };
  });
}

export function think(board: Board, player: Player, depth: number): Analysis {
  const scores = scoreMoves(board, player, depth);
  const best = scores.reduce((a, b) => (b.score > a.score ? b : a));

  const after = clone(board);
  drop(after, best.col, player);
  const settled = winner(after) !== EMPTY || isFull(after);
  const expectedReply = settled ? -1 : think(after, opponent(player), Math.max(1, depth - REPLY_DEPTH_DROP)).move;

  return { move: best.col, score: best.score, expectedReply };
}

export function winProbability(scoreForSecond: number): number {
  if (scoreForSecond > DECIDED / 2) return 0.98;
  if (scoreForSecond < -DECIDED / 2) return 0.02;
  return 1 / (1 + Math.exp(-scoreForSecond / CONFIDENCE_SCALE));
}
