import { useEffect, useMemo, useRef } from "react";
import { EMPTY, FIRST, SECOND, drop, emptyBoard, hasRoom, isFull, winner, winningCells, type Player } from "./engine";
import { friendCopy } from "./friendCopy";
import { useMatch } from "./useMatch";
import { winChime } from "@/lib/sounds";

function replay(moves: number[]) {
  const board = emptyBoard();
  let last: [number, number] | null = null;
  let player: Player = FIRST;

  for (const col of moves) {
    if (!hasRoom(board, col)) continue;
    last = [drop(board, col, player), col];
    player = player === FIRST ? SECOND : FIRST;
  }

  return { board, last };
}

export function useFriendGame(id: string) {
  const match = useMatch(id);
  const { myColor, others, moves, round, ready } = match;
  const chimedFor = useRef("");

  const { board, last } = useMemo(() => replay(moves), [moves]);
  const result = winner(board);
  const over = result !== EMPTY || isFull(board);
  const winningLine = useMemo(() => (result !== EMPTY ? winningCells(board) : []), [board, result]);

  const joined = others > 0;
  const waiting = !joined && moves.length === 0;
  const turn: Player = moves.length % 2 === 0 ? FIRST : SECOND;
  const mine = myColor !== null && turn === myColor;
  const copy = friendCopy({ moves: moves.length, over, result, myColor, mine, joined, waiting });
  const roundKey = `${round}:${moves.length}`;

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
