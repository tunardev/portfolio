import {
  COLS,
  EMPTY,
  ROWS,
  SLOTS,
  clone,
  drop,
  isFull,
  legalMoves,
  opponent,
  winner,
  type Board,
  type Player,
} from "./engine";

export const INPUTS = 2 * SLOTS;

export type Layer = { w: number[]; b: number[] };

export type Net = {
  version: string;
  trainedAt: string;
  gamesUsed: number;
  positions: number;
  hidden: Layer[];
  policy: Layer;
  value: Layer;
};

export type Prediction = { priors: number[]; value: number };

export type Choice = {
  move: number;
  value: number;
  priors: number[];
  expectedReply: number;
};

const PRIOR_TIEBREAK = 0.02;
const DEPTH_BONUS = 0.01;

export function encode(board: Board, player: Player): Float32Array {
  const planes = new Float32Array(INPUTS);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = board[row][col];
      if (cell === player) planes[row * COLS + col] = 1;
      else if (cell !== EMPTY) planes[SLOTS + row * COLS + col] = 1;
    }
  }
  return planes;
}

function dense(layer: Layer, input: ArrayLike<number>, relu: boolean): Float32Array {
  const outputs = layer.b.length;
  const inputs = input.length;
  const output = new Float32Array(outputs);

  for (let o = 0; o < outputs; o++) {
    let sum = layer.b[o];
    const row = o * inputs;
    for (let i = 0; i < inputs; i++) sum += layer.w[row + i] * input[i];
    output[o] = relu && sum < 0 ? 0 : sum;
  }

  return output;
}

export function predict(net: Net, board: Board, player: Player): Prediction {
  let activations: Float32Array = encode(board, player);
  for (const layer of net.hidden) activations = dense(layer, activations, true);

  const logits = dense(net.policy, activations, false);
  const value = Math.tanh(dense(net.value, activations, false)[0]);

  const legal = legalMoves(board);
  const priors = Array<number>(COLS).fill(0);
  const max = Math.max(...legal.map((col) => logits[col]));
  let total = 0;
  for (const col of legal) {
    priors[col] = Math.exp(logits[col] - max);
    total += priors[col];
  }
  for (const col of legal) priors[col] /= total;

  return { priors, value };
}

function search(net: Net, board: Board, player: Player, depth: number, alpha: number, beta: number): number {
  const won = winner(board);
  if (won === player) return 1 + depth * DEPTH_BONUS;
  if (won !== EMPTY) return -1 - depth * DEPTH_BONUS;
  if (isFull(board)) return 0;

  const { priors, value } = predict(net, board, player);
  if (depth === 0) return value;

  let best = -Infinity;
  for (const col of legalMoves(board).sort((a, b) => priors[b] - priors[a])) {
    const next = clone(board);
    drop(next, col, player);
    best = Math.max(best, -search(net, next, opponent(player), depth - 1, -beta, -alpha));
    alpha = Math.max(alpha, best);
    if (alpha >= beta) break;
  }
  return best;
}

export function choose(net: Net, board: Board, player: Player, depth = 4): Choice {
  const { priors } = predict(net, board, player);

  let move = -1;
  let best = -Infinity;
  for (const col of legalMoves(board)) {
    const next = clone(board);
    drop(next, col, player);
    const value = -search(net, next, opponent(player), depth - 1, -Infinity, Infinity) + priors[col] * PRIOR_TIEBREAK;
    if (value > best) {
      best = value;
      move = col;
    }
  }

  const after = clone(board);
  drop(after, move, player);

  let expectedReply = -1;
  if (winner(after) === EMPTY && !isFull(after)) {
    const replyPriors = predict(net, after, opponent(player)).priors;
    expectedReply = replyPriors.indexOf(Math.max(...replyPriors));
  }

  return { move, value: Math.max(-1, Math.min(1, best)), priors, expectedReply };
}
