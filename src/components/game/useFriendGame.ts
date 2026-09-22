import { useEffect, useMemo, useRef } from "react";
import { EMPTY, FIRST, drop, emptyBoard, hasRoom, isFull, opponent, winner, winningCells, type Player } from "./engine";
import { friendCopy } from "./friendCopy";
import { canAct } from "./seats";
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
  const { seat, myColor, bothSeated: joined, watching, moves, round, ready } = match;
  const chimedFor = useRef("");

  const { board, last, turn, played, result, over, winningLine } = useMemo(() => {
    const replayed = replay(moves);
    const won = winner(replayed.board);
    return {
      ...replayed,
      result: won,
      over: won !== EMPTY || isFull(replayed.board),
      winningLine: won !== EMPTY ? winningCells(replayed.board) : [],
    };
  }, [moves]);

  const waiting = canAct(seat) && !joined && played === 0;
  const mine = myColor !== null && turn === myColor;
  const copy = friendCopy({ seat, moves: played, over, result, myColor, mine, joined, waiting, watching });
  const canPlay = ready && !over && mine;
  const lastMove = last && `${board[last[0]][last[1]] === FIRST ? "Ink" : "Red"} played column ${last[1] + 1}.`;
  const announcement = over ? copy.title : lastMove && canAct(seat) ? `${lastMove} ${copy.title}` : (lastMove ?? "");
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
    canPlay,
    copy,
    announcement,
    roundKey,
    playMove: (col: number) => {
      if (canPlay) match.playMove(col);
    },
    canRematch: canAct(seat),
    rematch: match.rematch,
  };
}
