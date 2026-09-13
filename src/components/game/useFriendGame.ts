import { useEffect, useMemo, useRef } from "react";
import { EMPTY, FIRST, drop, emptyBoard, hasRoom, isFull, opponent, winner, winningCells, type Player } from "./engine";
import { friendCopy } from "./friendCopy";
import { SPECTATOR } from "./seats";
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
  const { seat, myColor, bothSeated, watching, moves, round, ready } = match;
  const chimedFor = useRef("");

  const { board, last, turn, played } = useMemo(() => replay(moves), [moves]);
  const result = winner(board);
  const over = result !== EMPTY || isFull(board);
  const winningLine = useMemo(() => (result !== EMPTY ? winningCells(board) : []), [board, result]);

  const joined = bothSeated;
  const waiting = seat !== SPECTATOR && !joined && played === 0;
  const mine = myColor !== null && turn === myColor;
  const copy = friendCopy({ seat, moves: played, over, result, myColor, mine, joined, waiting, watching });
  const canPlay = ready && !over && mine;
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
    seat,
    joined,
    waiting,
    canPlay,
    copy,
    roundKey,
    playMove: (col: number) => {
      if (canPlay) match.playMove(col);
    },
    canRematch: seat !== SPECTATOR,
    rematch: match.rematch,
  };
}
