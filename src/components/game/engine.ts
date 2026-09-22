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

type Line = [row: number, col: number, dRow: number, dCol: number];

function findLine(board: Board): Line | null {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const player = board[row][col];
      if (player === EMPTY) continue;
      for (const [dRow, dCol] of DIRECTIONS) {
        let length = 1;
        let r = row + dRow;
        let c = col + dCol;
        while (length < CONNECT && r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
          length++;
          r += dRow;
          c += dCol;
        }
        if (length === CONNECT) return [row, col, dRow, dCol];
      }
    }
  }
  return null;
}

export function winner(board: Board): Cell {
  const line = findLine(board);
  return line ? board[line[0]][line[1]] : EMPTY;
}

export function winningCells(board: Board): [number, number][] {
  const line = findLine(board);
  if (!line) return [];
  const [row, col, dRow, dCol] = line;
  return Array.from({ length: CONNECT }, (_, i): [number, number] => [row + i * dRow, col + i * dCol]);
}

function scoreWindow(mine: number, theirs: number): number {
  const empty = CONNECT - mine - theirs;
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
        let mine = 0;
        let theirs = 0;
        for (let i = 0; i < CONNECT; i++) {
          const cell = board[row + i * dRow][col + i * dCol];
          if (cell === SECOND) mine++;
          else if (cell === FIRST) theirs++;
        }
        score += scoreWindow(mine, theirs);
      }
    }
  }

  return score;
}

// mutates board while searching but always restores it before returning
function negamax(board: Board, depth: number, alpha: number, beta: number, player: Player): number {
  const won = winner(board);
  if (won === player) return DECIDED + depth;
  if (won !== EMPTY) return -DECIDED - depth;
  if (isFull(board)) return 0;
  if (depth === 0) return player === SECOND ? evaluateForSecond(board) : -evaluateForSecond(board);

  let best = -Infinity;
  for (const col of legalMoves(board)) {
    const row = drop(board, col, player);
    const score = -negamax(board, depth - 1, -beta, -alpha, opponent(player));
    board[row][col] = EMPTY;
    best = Math.max(best, score);
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
  const scratch = clone(board);
  return legalMoves(scratch).map((col) => {
    const row = drop(scratch, col, player);
    const score = -negamax(scratch, depth - 1, -Infinity, Infinity, opponent(player));
    scratch[row][col] = EMPTY;
    return { col, score };
  });
}

function bestMove(board: Board, player: Player, depth: number): MoveScore {
  return scoreMoves(board, player, depth).reduce((a, b) => (b.score > a.score ? b : a));
}

export function think(board: Board, player: Player, depth: number): Analysis {
  const best = bestMove(board, player, depth);

  const after = clone(board);
  drop(after, best.col, player);
  const settled = winner(after) !== EMPTY || isFull(after);
  const expectedReply = settled ? -1 : bestMove(after, opponent(player), Math.max(1, depth - REPLY_DEPTH_DROP)).col;

  return { move: best.col, score: best.score, expectedReply };
}

export function winProbability(scoreForSecond: number): number {
  if (scoreForSecond > DECIDED / 2) return 0.98;
  if (scoreForSecond < -DECIDED / 2) return 0.02;
  return 1 / (1 + Math.exp(-scoreForSecond / CONFIDENCE_SCALE));
}
