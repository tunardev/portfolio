import { EMPTY, FIRST, SECOND, clone, drop, emptyBoard, isFull, winner, type Board } from "./engine";
import type { Reply } from "./model";

export type GameState = {
  board: Board;
  moves: number[];
  confidence: number[];
  expected: number;
  last: [number, number] | null;
  thinking: boolean;
  sure: boolean;
};

export type GameAction = { type: "human"; col: number } | { type: "model"; reply: Reply } | { type: "reset" };

const EVEN = 0.5;
const HUMAN_WON = 0.02;
const MODEL_WON = 0.98;
const CONFIDENCE_FLOOR = 0.03;
const CONFIDENCE_CEILING = 0.97;

export const initialGame = (): GameState => ({
  board: emptyBoard(),
  moves: [],
  confidence: [EVEN],
  expected: -1,
  last: null,
  thinking: false,
  sure: false,
});

export const isOver = (board: Board) => winner(board) !== EMPTY || isFull(board);

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "reset":
      return initialGame();

    case "human": {
      const board = clone(state.board);
      const row = drop(board, action.col, FIRST);
      const over = isOver(board);

      return {
        ...state,
        board,
        moves: [...state.moves, action.col],
        last: [row, action.col],
        thinking: !over,
        confidence: over ? [...state.confidence, winner(board) === FIRST ? HUMAN_WON : EVEN] : state.confidence,
      };
    }

    case "model": {
      const board = clone(state.board);
      const row = drop(board, action.reply.move, SECOND);
      const won = winner(board) === SECOND;

      return {
        board,
        moves: [...state.moves, action.reply.move],
        last: [row, action.reply.move],
        expected: action.reply.expectedReply,
        sure: action.reply.sure,
        thinking: false,
        confidence: [
          ...state.confidence,
          won ? MODEL_WON : Math.min(CONFIDENCE_CEILING, Math.max(CONFIDENCE_FLOOR, action.reply.confidence)),
        ],
      };
    }
  }
}
