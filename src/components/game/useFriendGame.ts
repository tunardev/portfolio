import { useEffect, useMemo, useRef } from "react";
import { EMPTY, FIRST, drop, emptyBoard, hasRoom, isFull, opponent, winner, winningCells, type Player } from "./engine";
import { friendCopy } from "./friendCopy";
import { useMatch } from "./useMatch";
import { winChime } from "@/lib/sounds";

export function replay(moves: number[]) {
  const board = emptyBoard();
  let last: [number, number] | null = null;
  let turn: Player = FIRST;
  let played = 0;

  for (const col of moves) {
    if (!hasRoom(board, col)) continue;
    last = [drop(board, col, turn), col];
    turn = opponent(turn);
    played += 1;
  }

  return { board, last, turn, played };
}

export function useFriendGame(id: string) {
  const match = useMatch(id);
  const { myColor, others, moves, round, ready } = match;
  const chimedFor = useRef("");

  const { board, last, turn, played } = useMemo(() => replay(moves), [moves]);
  const result = winner(board);
  const over = result !== EMPTY || isFull(board);
  const winningLine = useMemo(() => (result !== EMPTY ? winningCells(board) : []), [board, result]);

  const joined = others > 0;
  const waiting = !joined && played === 0;
  const mine = myColor !== null && turn === myColor;
  const copy = friendCopy({ moves: played, over, result, myColor, mine, joined, waiting });
  const roundKey = `${round}:${played}`;

  useEffect(() => {
    if (copy.iWon && chimedFor.current !== roundKey) {
      chimedFor.current = roundKey;
      winChime();
    }
  }, [copy.iWon, roundKey]);

  return {
    configured: match.configured,
    board,
    last,
    winningLine,
    over,
    joined,
    waiting,
    canPlay: ready && !over && mine,
    copy,
    roundKey,
    playMove: match.playMove,
    rematch: match.rematch,
  };
}
