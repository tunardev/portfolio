import { SECOND, think, winProbability, type Board } from "./engine";
import { choose, isNet, type Net } from "./net";

const WEIGHTS_URL = "/model/weights.json";
const SEARCH_DEPTH = 6;
const NET_DEPTH = 5;
const NET_SURE_ABOVE = 0.35;
const SEARCH_SURE_ABOVE = 40;

let weights: Promise<Net | null> | null = null;

export function loadNet() {
  weights ??= fetch(WEIGHTS_URL)
    .then((response) => (response.ok ? response.json() : null))
    .then((json: unknown) => (isNet(json) ? json : null))
    .catch(() => null);
  return weights;
}

export type Reply = {
  move: number;
  confidence: number;
  expectedReply: number;
  sure: boolean;
};

export function reply(net: Net | null, board: Board): Reply {
  if (net) {
    const choice = choose(net, board, SECOND, NET_DEPTH);
    return {
      move: choice.move,
      confidence: (1 + choice.value) / 2,
      expectedReply: choice.expectedReply,
      sure: Math.abs(choice.value) > NET_SURE_ABOVE,
    };
  }

  const analysis = think(board, SECOND, SEARCH_DEPTH);
  return {
    move: analysis.move,
    confidence: winProbability(analysis.score),
    expectedReply: analysis.expectedReply,
    sure: Math.abs(analysis.score) > SEARCH_SURE_ABOVE,
  };
}
