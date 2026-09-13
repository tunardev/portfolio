import { useReducer, useRef, useState } from "react";
import { EMPTY, FIRST, SECOND, hasRoom, isFull, winner, winningCells, type Board } from "./engine";
import { loadNet, reply } from "./model";
import type { Net } from "./net";
import { gameReducer, initialGame, isOver, type GameState } from "./reducer";
import { recordGame, type Stats } from "./stats";
import { findTurning } from "./turning";
import { winChime } from "@/lib/sounds";

const REPLY_DELAY = 320;
const SEARCH_VERSION = "search";

export function useModelGame(onStats: (stats: Stats) => void) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialGame);
  const [trainedOn, setTrainedOn] = useState<string | null>(null);
  const net = useRef<Net | null>(null);

  const { board, moves, confidence } = state;
  const result = winner(board);
  const over = result !== EMPTY || isFull(board);
  const humanTurn = !over && moves.length % 2 === 0 && !state.thinking;

  const finish = (finalMoves: number[], finalBoard: Board) => {
    const won = winner(finalBoard);
    if (won === FIRST) winChime();

    const outcome = won === FIRST ? "human" : won === SECOND ? "model" : "draw";
    void recordGame(finalMoves, outcome, net.current?.version ?? SEARCH_VERSION).then(
      (stats) => stats && onStats(stats),
    );
  };

  const answer = async (after: GameState) => {
    net.current ??= await loadNet();
    if (net.current && !trainedOn) {
      setTrainedOn(new Date(net.current.trainedAt).toLocaleDateString("en-US", { month: "long", day: "numeric" }));
    }

    const modelReply = reply(net.current, after.board);
    dispatch({ type: "model", reply: modelReply });

    const next = gameReducer(after, { type: "model", reply: modelReply });
    if (isOver(next.board)) finish(next.moves, next.board);
  };

  const play = (col: number) => {
    if (!humanTurn || !hasRoom(board, col)) return;
    dispatch({ type: "human", col });

    const after = gameReducer(state, { type: "human", col });
    if (isOver(after.board)) {
      finish(after.moves, after.board);
      return;
    }
    window.setTimeout(() => void answer(after), REPLY_DELAY);
  };

  return {
    board,
    last: state.last,
    moves,
    expected: state.expected,
    sure: state.sure,
    confidence,
    result,
    over,
    humanTurn,
    trainedOn,
    modelWinPct: Math.round((confidence[confidence.length - 1] ?? 0.5) * 100),
    winningLine: result !== EMPTY ? winningCells(board) : [],
    turning: over ? findTurning(confidence, result, moves) : null,
    play,
    reset: () => dispatch({ type: "reset" }),
  };
}
