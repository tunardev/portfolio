import { NextResponse } from "next/server";
import {
  COLS,
  EMPTY,
  FIRST,
  SLOTS,
  drop,
  emptyBoard,
  hasRoom,
  opponent,
  winner,
  type Player,
} from "@/components/game/engine";
import { getStats, recordGame, type Game, type Outcome } from "@/lib/games-store";
import { allowRequest, claimSubmission, retryAfterSeconds } from "@/lib/limits";

export const dynamic = "force-dynamic";

const OUTCOMES: readonly string[] = ["human", "model", "draw"];
const MAX_MODEL_VERSION_LENGTH = 40;
const UNKNOWN_CLIENT = "unknown";

function clientOf(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || UNKNOWN_CLIENT;
}

function fingerprintOf(client: string, game: Omit<Game, "created_at">) {
  return `${client}|${game.result}|${game.moves.join(",")}`;
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

function isPlayable(moves: number[]) {
  const board = emptyBoard();
  let player: Player = FIRST;

  for (const col of moves) {
    if (!hasRoom(board, col) || winner(board) !== EMPTY) return false;
    drop(board, col, player);
    player = opponent(player);
  }

  return true;
}

function parseGame(body: unknown): Omit<Game, "created_at"> | null {
  if (!body || typeof body !== "object") return null;

  const { moves, result, modelVersion } = body as Record<string, unknown>;
  if (!isColumnList(moves) || !isPlayable(moves)) return null;
  if (typeof result !== "string" || !OUTCOMES.includes(result)) return null;

  return {
    moves,
    result: result as Outcome,
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

  if (!claimSubmission(fingerprintOf(client, game))) {
    return NextResponse.json({ error: "already recorded" }, { status: 409 });
  }

  try {
    return NextResponse.json(await recordGame(game));
  } catch (error) {
    return serverError("record game", error);
  }
}
