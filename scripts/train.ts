import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as tf from "@tensorflow/tfjs";
import {
  COLS,
  EMPTY,
  FIRST,
  ROWS,
  SECOND,
  SLOTS,
  clone,
  drop,
  emptyBoard,
  hasRoom,
  isFull,
  legalMoves,
  opponent,
  scoreMoves,
  think,
  winner,
  type Board,
  type Player,
} from "../src/components/game/engine";
import { INPUTS, choose, encode, predict, type Layer, type Net } from "../src/components/game/net";
import { getAllGames, isStoreConfigured, recordModelVersion, type Outcome } from "../src/lib/games-store";

const WEIGHTS_PATH = path.join("public", "model", "weights.json");
const TEACHER_GAMES = Number(process.env.TRAIN_GAMES ?? 2000);
const TEACHER_DEPTH = Number(process.env.TRAIN_DEPTH ?? 5);
const EPOCHS = Number(process.env.TRAIN_EPOCHS ?? 24);
const VISITOR_WEIGHT = 3;

const PLANES = INPUTS / SLOTS;

const POLICY_TEMPERATURE = 40;
const POLICY_LOGIT_FLOOR = -30;
const VALUE_SCALE = 250;
const TEACHER_VALUE_WEIGHT = 0.5;
const FINAL_OUTCOME_WEIGHT = 0.5;

const NOISE_FLOOR = 0.08;
const NOISE_SPAN = 0.25;
const OPENING_RANDOM_PLIES = 2;
const MIN_PLAY_DEPTH = 2;
const TEACHER_PLAY_DEPTH_DROP = 2;
const NET_PLAY_DEPTH = 2;
const NET_GAME_INTERVAL = 3;
const PROGRESS_INTERVAL = 100;

const HIDDEN_1_NAME = "h1";
const HIDDEN_2_NAME = "h2";
const POLICY_NAME = "policy";
const VALUE_NAME = "value";
const HIDDEN_1_UNITS = 128;
const HIDDEN_2_UNITS = 64;
const LEARNING_RATE = 1e-3;
const BATCH_SIZE = 256;
const VALIDATION_SPLIT = 0.05;
const WEIGHT_PRECISION = 10000;

const EVAL_GAMES = 40;
const EVAL_DEPTH = 4;
const EVAL_NET_DEPTH = 4;
const EVAL_RANDOM_OPENING_CHANCE = 0.5;

const BYTES_PER_KB = 1024;
const MS_PER_MINUTE = 60_000;

type Sample = { input: Float32Array; policy: number[]; value: number };

type StoredGame = { moves: number[]; result: Outcome };

type MoveChooser = (board: Board, player: Player, ply: number) => number;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function quantiseWeight(weight: number) {
  return Math.round(weight * WEIGHT_PRECISION) / WEIGHT_PRECISION;
}

function teacherLabel(board: Board, player: Player): { policy: number[]; value: number } {
  const scores = scoreMoves(board, player, TEACHER_DEPTH);
  const max = Math.max(...scores.map((move) => move.score));
  const policy = Array<number>(COLS).fill(0);
  let sum = 0;
  for (const { col, score } of scores) {
    policy[col] = Math.exp(Math.max(POLICY_LOGIT_FLOOR, (score - max) / POLICY_TEMPERATURE));
    sum += policy[col];
  }
  for (let col = 0; col < COLS; col++) policy[col] /= sum;
  return { policy, value: Math.tanh(max / VALUE_SCALE) };
}

function blendedValue(teacherValue: number, outcome: number) {
  return TEACHER_VALUE_WEIGHT * teacherValue + FINAL_OUTCOME_WEIGHT * outcome;
}

function mirror(sample: Sample): Sample {
  const input = new Float32Array(INPUTS);
  for (let plane = 0; plane < PLANES; plane++)
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++)
        input[plane * SLOTS + row * COLS + (COLS - 1 - col)] = sample.input[plane * SLOTS + row * COLS + col];
  return { input, policy: [...sample.policy].reverse(), value: sample.value };
}

function playGame(pick: MoveChooser): Sample[] {
  const board = emptyBoard();
  const trail: { board: Board; player: Player; policy: number[]; value: number }[] = [];
  let player: Player = FIRST;
  let ply = 0;
  while (winner(board) === EMPTY && !isFull(board)) {
    const label = teacherLabel(board, player);
    trail.push({ board: clone(board), player, ...label });
    drop(board, pick(board, player, ply), player);
    player = opponent(player);
    ply++;
  }
  const won = winner(board);
  return trail.map((position) => {
    const outcome = won === EMPTY ? 0 : won === position.player ? 1 : -1;
    return {
      input: encode(position.board, position.player),
      policy: position.policy,
      value: blendedValue(position.value, outcome),
    };
  });
}

function loadPrevious(): Net | null {
  if (!existsSync(WEIGHTS_PATH)) return null;
  return JSON.parse(readFileSync(WEIGHTS_PATH, "utf8")) as Net;
}

function teacherGames(count: number, previous: Net | null): Sample[] {
  const samples: Sample[] = [];
  for (let game = 0; game < count; game++) {
    const noise = NOISE_FLOOR + Math.random() * NOISE_SPAN;
    const teacherNet = previous && game % NET_GAME_INTERVAL === 0 ? previous : null;
    samples.push(
      ...playGame((board, player, ply) => {
        if (Math.random() < noise || ply < OPENING_RANDOM_PLIES) return pickRandom(legalMoves(board));
        if (teacherNet) return choose(teacherNet, board, player, NET_PLAY_DEPTH).move;
        return think(board, player, Math.max(MIN_PLAY_DEPTH, TEACHER_DEPTH - TEACHER_PLAY_DEPTH_DROP)).move;
      }),
    );
    if ((game + 1) % PROGRESS_INTERVAL === 0) {
      console.log(`  ${game + 1}/${count} games, ${samples.length} positions`);
    }
  }
  return samples;
}

function visitorSamples(games: StoredGame[]): Sample[] {
  const samples: Sample[] = [];
  for (const game of games) {
    const board = emptyBoard();
    let player: Player = FIRST;
    for (const col of game.moves) {
      if (!hasRoom(board, col)) break;
      const label = teacherLabel(board, player);
      const humanMoved = player === FIRST;
      const outcome = game.result === "draw" ? 0 : (game.result === "human") === humanMoved ? 1 : -1;
      samples.push({
        input: encode(board, player),
        policy: label.policy,
        value: blendedValue(label.value, outcome),
      });
      drop(board, col, player);
      player = opponent(player);
      if (winner(board) !== EMPTY) break;
    }
  }
  return samples;
}

async function fetchStoredGames(): Promise<StoredGame[]> {
  if (!isStoreConfigured()) {
    console.log("no Supabase credentials, training on generated games only");
    return [];
  }
  return getAllGames();
}

async function toPlainLayer(layer: tf.layers.Layer): Promise<Layer> {
  const [kernelTensor, biasTensor] = layer.getWeights();
  const kernelByInput = (await kernelTensor.array()) as number[][];
  const biases = (await biasTensor.array()) as number[];
  const flatKernel: number[] = [];
  for (let output = 0; output < biases.length; output++) {
    for (let input = 0; input < kernelByInput.length; input++) {
      flatKernel.push(quantiseWeight(kernelByInput[input][output]));
    }
  }
  return { w: flatKernel, b: biases.map(quantiseWeight) };
}

function versusEngine(net: Net, games: number, depth: number) {
  let wins = 0;
  let draws = 0;
  for (let game = 0; game < games; game++) {
    const netPlayer: Player = game % 2 === 0 ? FIRST : SECOND;
    const board = emptyBoard();
    let player: Player = FIRST;
    let ply = 0;
    while (winner(board) === EMPTY && !isFull(board)) {
      const col =
        ply < OPENING_RANDOM_PLIES && Math.random() < EVAL_RANDOM_OPENING_CHANCE
          ? pickRandom(legalMoves(board))
          : player === netPlayer
            ? choose(net, board, player, EVAL_NET_DEPTH).move
            : think(board, player, depth).move;
      drop(board, col, player);
      player = opponent(player);
      ply++;
    }
    const won = winner(board);
    if (won === netPlayer) wins++;
    else if (won === EMPTY) draws++;
  }
  return { wins, draws, losses: games - wins - draws };
}

function shuffle(samples: Sample[]) {
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }
}

function buildSamples(previous: Net | null, stored: StoredGame[]): Sample[] {
  console.log(`generating ${TEACHER_GAMES} teacher games at depth ${TEACHER_DEPTH}`);
  const generated = teacherGames(TEACHER_GAMES, previous);
  const visitors = visitorSamples(stored);
  console.log(`${generated.length} generated positions, ${visitors.length} visitor positions`);

  const samples: Sample[] = [...generated];
  for (let i = 0; i < VISITOR_WEIGHT; i++) samples.push(...visitors);

  const augmented = samples.flatMap((sample) => [sample, mirror(sample)]);
  shuffle(augmented);
  return augmented;
}

async function trainModel(samples: Sample[]): Promise<tf.LayersModel> {
  const xs = tf.tensor2d(
    samples.map((sample) => Array.from(sample.input)),
    [samples.length, INPUTS],
  );
  const policyTargets = tf.tensor2d(samples.map((sample) => sample.policy));
  const valueTargets = tf.tensor2d(samples.map((sample) => [sample.value]));

  const input = tf.input({ shape: [INPUTS] });
  const hidden1 = tf.layers
    .dense({ units: HIDDEN_1_UNITS, activation: "relu", name: HIDDEN_1_NAME })
    .apply(input) as tf.SymbolicTensor;
  const hidden2 = tf.layers
    .dense({ units: HIDDEN_2_UNITS, activation: "relu", name: HIDDEN_2_NAME })
    .apply(hidden1) as tf.SymbolicTensor;
  const policy = tf.layers
    .dense({ units: COLS, activation: "softmax", name: POLICY_NAME })
    .apply(hidden2) as tf.SymbolicTensor;
  const value = tf.layers.dense({ units: 1, activation: "tanh", name: VALUE_NAME }).apply(hidden2) as tf.SymbolicTensor;

  const model = tf.model({ inputs: input, outputs: [policy, value] });
  model.compile({
    optimizer: tf.train.adam(LEARNING_RATE),
    loss: { policy: "categoricalCrossentropy", value: "meanSquaredError" },
  });

  console.log(`training on ${samples.length} positions for ${EPOCHS} epochs`);
  await model.fit(xs, [policyTargets, valueTargets], {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    validationSplit: VALIDATION_SPLIT,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) =>
        console.log(
          `  epoch ${epoch + 1}: policy ${logs?.policy_loss?.toFixed(3)} value ${logs?.value_loss?.toFixed(3)} val ${logs?.val_loss?.toFixed(3)}`,
        ),
    },
  });

  return model;
}

async function exportNet(model: tf.LayersModel, gamesUsed: number, positions: number): Promise<Net> {
  const trainedAt = new Date();
  return {
    version: trainedAt.toISOString().slice(0, 10),
    trainedAt: trainedAt.toISOString(),
    gamesUsed,
    positions,
    hidden: [await toPlainLayer(model.getLayer(HIDDEN_1_NAME)), await toPlainLayer(model.getLayer(HIDDEN_2_NAME))],
    policy: await toPlainLayer(model.getLayer(POLICY_NAME)),
    value: await toPlainLayer(model.getLayer(VALUE_NAME)),
  };
}

function writeNet(net: Net, startedAt: number) {
  const serialised = JSON.stringify(net);
  mkdirSync(path.dirname(WEIGHTS_PATH), { recursive: true });
  writeFileSync(WEIGHTS_PATH, serialised);
  const kb = (Buffer.byteLength(serialised) / BYTES_PER_KB).toFixed(0);
  const minutes = ((Date.now() - startedAt) / MS_PER_MINUTE).toFixed(1);
  console.log(`wrote ${WEIGHTS_PATH} (${kb} KB) in ${minutes} min`);
}

async function main() {
  const started = Date.now();
  const previous = loadPrevious();
  console.log(previous ? `previous model ${previous.version}` : "no previous model");

  const stored = await fetchStoredGames();
  console.log(`${stored.length} stored visitor games`);

  const samples = buildSamples(previous, stored);
  const model = await trainModel(samples);
  const net = await exportNet(model, stored.length, samples.length);

  const sanity = predict(net, emptyBoard(), FIRST);
  console.log(
    `empty board priors ${sanity.priors.map((prior) => prior.toFixed(2)).join(" ")} value ${sanity.value.toFixed(2)}`,
  );
  const match = versusEngine(net, EVAL_GAMES, EVAL_DEPTH);
  console.log(`versus depth-${EVAL_DEPTH} search: ${match.wins} wins, ${match.draws} draws, ${match.losses} losses`);

  writeNet(net, started);

  if (isStoreConfigured()) {
    await recordModelVersion({
      version: net.version,
      games_used: stored.length,
      positions: samples.length,
      notes: `vs depth-${EVAL_DEPTH} search: ${match.wins}W ${match.draws}D ${match.losses}L`,
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
