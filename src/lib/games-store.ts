import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Outcome = "human" | "model" | "draw";

export type Game = {
  moves: number[];
  result: Outcome;
  model_version: string | null;
  created_at: string;
};

export type Stats = {
  games: number;
  modelWinRate: number;
  humanWinsToday: number;
  gamesToday: number;
  firstMonthRate: number;
  modelVersion: string | null;
};

const DAY_MS = 86_400_000;
const PAGE_SIZE = 1000;
const MIN_GAMES_FOR_FIRST_MONTH_RATE = 20;

let serverClient: SupabaseClient | null = null;

function credentials() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export function isStoreConfigured() {
  return credentials() !== null;
}

function db(): SupabaseClient {
  if (serverClient) return serverClient;
  const config = credentials();
  if (!config) {
    throw new Error("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  serverClient = createClient(config.url, config.key, { auth: { persistSession: false } });
  return serverClient;
}

type Span = { start: string; end: string };

function monthAround(iso: string): Span {
  const at = new Date(iso);
  return {
    start: new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1)).toISOString(),
    end: new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1)).toISOString(),
  };
}

function today(): Span {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { start: new Date(start).toISOString(), end: new Date(start + DAY_MS).toISOString() };
}

type Filter = { result?: Outcome; notResult?: Outcome; from?: string; to?: string };

async function count(sb: SupabaseClient, filter: Filter = {}) {
  let query = sb.from("games").select("id", { count: "exact", head: true });
  if (filter.result) query = query.eq("result", filter.result);
  if (filter.notResult) query = query.neq("result", filter.notResult);
  if (filter.from) query = query.gte("created_at", filter.from);
  if (filter.to) query = query.lt("created_at", filter.to);

  const { count: rows, error } = await query;
  if (error) throw new Error(error.message);
  return rows ?? 0;
}

export async function getStats(): Promise<Stats> {
  const sb = db();
  const day = today();

  const [games, modelWins, humanWins, gamesToday, humanWinsToday, oldest, newestModel] = await Promise.all([
    count(sb),
    count(sb, { result: "model" }),
    count(sb, { result: "human" }),
    count(sb, { from: day.start, to: day.end }),
    count(sb, { result: "human", from: day.start, to: day.end }),
    sb.from("games").select("created_at").order("created_at", { ascending: true }).limit(1).maybeSingle(),
    sb.from("model_versions").select("version").order("trained_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  let firstMonthRate = 0;
  if (oldest.data?.created_at) {
    const month = monthAround(oldest.data.created_at);
    const [decided, wins] = await Promise.all([
      count(sb, { notResult: "draw", from: month.start, to: month.end }),
      count(sb, { result: "model", from: month.start, to: month.end }),
    ]);
    if (decided >= MIN_GAMES_FOR_FIRST_MONTH_RATE) firstMonthRate = wins / decided;
  }

  const decided = modelWins + humanWins;

  return {
    games,
    modelWinRate: decided ? modelWins / decided : 0,
    humanWinsToday,
    gamesToday,
    firstMonthRate,
    modelVersion: newestModel.data?.version ?? null,
  };
}

export async function recordGame(game: Omit<Game, "created_at">) {
  const { error } = await db().from("games").insert(game);
  if (error) throw new Error(error.message);
}

export async function getAllGames(): Promise<Game[]> {
  const sb = db();
  const all: Game[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from("games")
      .select("moves,result,model_version,created_at")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    all.push(...((data ?? []) as Game[]));
    if (!data || data.length < PAGE_SIZE) return all;
  }
}

export async function recordModelVersion(row: {
  version: string;
  games_used: number;
  positions: number;
  notes?: string;
}) {
  const { error } = await db().from("model_versions").upsert(row);
  if (error) throw new Error(error.message);
}
