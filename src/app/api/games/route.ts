import { NextResponse } from "next/server";
import {
  COLS,
  EMPTY,
  FIRST,
  SECOND,
  SLOTS,
  drop,
  emptyBoard,
  hasRoom,
  isFull,
  opponent,
  winner,
  type Cell,
  type Player,
} from "@/components/game/engine";
import { getStats, recordGame, type Game, type Outcome } from "@/lib/games-store";
import { allowRequest, claimSubmission, releaseSubmission, retryAfterSeconds } from "@/lib/limits";

export const dynamic = "force-dynamic";

const MAX_MODEL_VERSION_LENGTH = 40;
const UNKNOWN_CLIENT = "unknown";

type Submission = Omit<Game, "created_at">;

function clientOf(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || UNKNOWN_CLIENT;
}

function serverError(action: string, error: unknown) {
  console.error(`api/games: ${action} failed`, error);
  return NextResponse.json({ error: "something went wrong" }, { status: 500 });
}

function isColumnList(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= SLOTS &&
    value.every((col) => Number.isInteger(col) && col >= 0 && col < COLS)
  );
}

// the human always moves first against the model, so FIRST winning is a human win
function outcomeOf(moves: number[]): Outcome | null {
  const board = emptyBoard();
  let player: Player = FIRST;
  let won: Cell = EMPTY;

  for (const col of moves) {
    if (won !== EMPTY || !hasRoom(board, col)) return null;
    drop(board, col, player);
    won = winner(board);
    player = opponent(player);
  }

  if (won === FIRST) return "human";
  if (won === SECOND) return "model";
  return isFull(board) ? "draw" : null;
}

function parseGame(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;

  const { moves, result, modelVersion } = body as Record<string, unknown>;
  if (!isColumnList(moves)) return null;

  const outcome = outcomeOf(moves);
  if (!outcome || result !== outcome) return null;

  return {
    moves,
    result: outcome,
    model_version: typeof modelVersion === "string" ? modelVersion.slice(0, MAX_MODEL_VERSION_LENGTH) : null,
  };
}

export async function GET() {
  try {
    return NextResponse.json(await getStats());
  } catch (error) {
    return serverError("read stats", error);
  }
}

export async function POST(req: Request) {
  const client = clientOf(req);
  if (!allowRequest(client)) {
    return NextResponse.json(
      { error: "too many games" },
      { status: 429, headers: { "retry-after": String(retryAfterSeconds(client)) } },
    );
  }

  const game = parseGame(await req.json().catch(() => null));
  if (!game) return NextResponse.json({ error: "bad game" }, { status: 400 });

  const fingerprint = `${client}|${game.moves.join(",")}`;
  if (!claimSubmission(fingerprint)) {
    return NextResponse.json({ error: "already recorded" }, { status: 409 });
  }

  try {
    await recordGame(game);
  } catch (error) {
    releaseSubmission(fingerprint);
    return serverError("record game", error);
  }

  try {
    return NextResponse.json(await getStats());
  } catch (error) {
    return serverError("read stats", error);
  }
}
