import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { COLS, SLOTS } from "@/components/game/engine";
import * as store from "@/lib/games-store";
import { RATE_LIMIT_MAX, resetLimits } from "@/lib/limits";
import { GET, POST } from "./route";

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("refusing to run: test-setup.ts did not scrub the database credentials");
}

beforeEach(() => {
  resetLimits();
  spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  mock.restore();
});

function postRaw(body: string, client?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (client) headers["x-forwarded-for"] = client;
  return POST(new Request("http://localhost/api/games", { method: "POST", headers, body }));
}

function post(body: unknown, client?: string) {
  return postRaw(JSON.stringify(body), client);
}

function humanWin(seed: number) {
  const col = seed % COLS;
  const other = (col + 1 + Math.floor(seed / COLS)) % COLS;
  return [col, other, col, other, col, other, col];
}

const HUMAN_WIN = humanWin(0);

const MODEL_WIN = [0, 3, 1, 3, 0, 3, 1, 3];

const DRAWN_GAME = [
  3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 0, 1, 1, 1, 1, 1, 1, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0, 6, 6, 6,
  6, 6, 6,
];

const STATS: store.Stats = {
  games: 1,
  modelWinRate: 0,
  humanWinsToday: 1,
  gamesToday: 1,
  firstMonthRate: 0,
  modelVersion: null,
};

describe("POST /api/games body validation", () => {
  test("rejects non-JSON body", async () => {
    const response = await postRaw("this is not json");
    expect(response.status).toBe(400);
  });

  test("rejects empty body", async () => {
    const response = await postRaw("");
    expect(response.status).toBe(400);
  });

  test("rejects JSON null body", async () => {
    const response = await post(null);
    expect(response.status).toBe(400);
  });

  test("rejects JSON string body", async () => {
    const response = await post("moves");
    expect(response.status).toBe(400);
  });

  test("returns generic error message", async () => {
    const response = await postRaw("this is not json");
    expect(await response.json()).toEqual({ error: "bad game" });
  });
});

describe("POST /api/games moves validation", () => {
  test("rejects missing moves", async () => {
    const response = await post({ result: "human" });
    expect(response.status).toBe(400);
  });

  test("rejects string moves", async () => {
    const response = await post({ moves: "0,1,2", result: "human" });
    expect(response.status).toBe(400);
  });

  test("rejects object moves", async () => {
    const response = await post({ moves: { 0: 3 }, result: "human" });
    expect(response.status).toBe(400);
  });

  test("rejects empty moves", async () => {
    const response = await post({ moves: [], result: "human" });
    expect(response.status).toBe(400);
  });

  test("rejects moves exceeding board slots", async () => {
    const moves = Array.from({ length: SLOTS + 1 }, (_, i) => i % COLS);
    const response = await post({ moves, result: "draw" });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/games column validation", () => {
  const cases: [string, unknown][] = [
    ["negative column", -1],
    ["column equal to column count", COLS],
    ["column exceeding column count", 99],
    ["non-integer column", 2.5],
    ["numeric string column", "3"],
    ["null column", null],
    ["boolean column", true],
    ["NaN column", Number.NaN],
    ["infinite column", Number.POSITIVE_INFINITY],
  ];

  for (const [label, col] of cases) {
    test(`rejects ${label}`, async () => {
      const response = await post({ moves: [...HUMAN_WIN.slice(0, -1), col], result: "human" });
      expect(response.status).toBe(400);
    });
  }
});

describe("POST /api/games result validation", () => {
  test("rejects missing result", async () => {
    const response = await post({ moves: HUMAN_WIN });
    expect(response.status).toBe(400);
  });

  test("rejects unknown result", async () => {
    const response = await post({ moves: HUMAN_WIN, result: "model_won" });
    expect(response.status).toBe(400);
  });

  test("rejects case-mismatched result", async () => {
    const response = await post({ moves: HUMAN_WIN, result: "Human" });
    expect(response.status).toBe(400);
  });

  test("rejects non-string result", async () => {
    const response = await post({ moves: HUMAN_WIN, result: 1 });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/games result consistency", () => {
  const cases: [string, number[], string][] = [
    ["human win claimed as model win", HUMAN_WIN, "model"],
    ["human win claimed as draw", HUMAN_WIN, "draw"],
    ["model win claimed as human win", MODEL_WIN, "human"],
    ["full board claimed as human win", DRAWN_GAME, "human"],
    ["unfinished game claimed as draw", [3], "draw"],
    ["unfinished game claimed as human win", [3, 3, 4], "human"],
  ];

  for (const [label, moves, result] of cases) {
    test(`rejects ${label}`, async () => {
      const response = await post({ moves, result });
      expect(response.status).toBe(400);
    });
  }
});

describe("POST /api/games move legality", () => {
  test("rejects move into full column", async () => {
    const response = await post({ moves: [0, 0, 0, 0, 0, 0, 0], result: "draw" });
    expect(response.status).toBe(400);
  });

  test("rejects full-column move when skipping yields win", async () => {
    const response = await post({ moves: [0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 2, 1, 2, 1], result: "model" });
    expect(response.status).toBe(400);
  });

  test("rejects move into previously filled column", async () => {
    const response = await post({
      moves: [...DRAWN_GAME.slice(0, 20), 3, ...DRAWN_GAME.slice(20, 22)],
      result: "model",
    });
    expect(response.status).toBe(400);
  });

  test("rejects move after win", async () => {
    const response = await post({ moves: [...HUMAN_WIN, 1], result: "human" });
    expect(response.status).toBe(400);
  });

  test("rejects multiple moves after win", async () => {
    const response = await post({ moves: [...HUMAN_WIN, 1, 2, 3, 4], result: "human" });
    expect(response.status).toBe(400);
  });

  test("rejects moves after horizontal win", async () => {
    const response = await post({ moves: [0, 0, 1, 1, 2, 2, 3, 3], result: "human" });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/games valid games", () => {
  test("accepts human win", async () => {
    const response = await post({ moves: HUMAN_WIN, result: "human" });
    expect(response.status).not.toBe(400);
  });

  test("accepts model win", async () => {
    const response = await post({ moves: MODEL_WIN, result: "model" });
    expect(response.status).not.toBe(400);
  });

  test("accepts full-board draw", async () => {
    expect(DRAWN_GAME).toHaveLength(SLOTS);
    const response = await post({ moves: DRAWN_GAME, result: "draw" });
    expect(response.status).not.toBe(400);
  });

  test("returns 500 without database", async () => {
    const response = await post({ moves: HUMAN_WIN, result: "human" });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "something went wrong" });
  });
});

describe("GET /api/games without database", () => {
  test("returns 500 without throwing", async () => {
    const response = await GET();
    expect(response.status).toBe(500);
  });

  test("returns generic error message", async () => {
    const response = await GET();
    expect(await response.json()).toEqual({ error: "something went wrong" });
  });

  test("omits Supabase and Postgres details", async () => {
    const body = (await (await GET()).text()).toLowerCase();
    for (const leak of ["supabase", "postgres", "pgrst", "service_role", "anon key", "http://", "https://"]) {
      expect(body).not.toContain(leak);
    }
  });
});

describe("POST /api/games rate limiting", () => {
  test("allows requests up to limit", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const response = await post({ moves: humanWin(i), result: "human" }, "203.0.113.10");
      expect(response.status).not.toBe(429);
    }
  });

  test("returns 429 when limit exceeded", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      await post({ moves: humanWin(i), result: "human" }, "203.0.113.11");
    }
    const response = await post({ moves: MODEL_WIN, result: "model" }, "203.0.113.11");
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "too many games" });
  });

  test("sets positive Retry-After header", async () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) {
      await post({ moves: humanWin(i), result: "human" }, "203.0.113.12");
    }
    const response = await post({ moves: MODEL_WIN, result: "model" }, "203.0.113.12");
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  test("counts malformed bodies toward limit", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect((await postRaw("not json", "203.0.113.13")).status).toBe(400);
    }
    expect((await postRaw("not json", "203.0.113.13")).status).toBe(429);
  });

  test("limits each client independently", async () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) {
      await post({ moves: humanWin(i), result: "human" }, "203.0.113.14");
    }
    expect((await post({ moves: MODEL_WIN, result: "model" }, "203.0.113.14")).status).toBe(429);
    expect((await post({ moves: MODEL_WIN, result: "model" }, "203.0.113.15")).status).not.toBe(429);
  });
});

describe("POST /api/games deduplication", () => {
  beforeEach(() => {
    spyOn(store, "recordGame").mockResolvedValue(undefined);
    spyOn(store, "getStats").mockResolvedValue(STATS);
  });

  test("returns 200 with updated stats", async () => {
    const response = await post({ moves: HUMAN_WIN, result: "human" }, "198.51.100.1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(STATS);
  });

  test("returns 409 for duplicate from same client", async () => {
    const game = { moves: HUMAN_WIN, result: "human" };
    expect((await post(game, "198.51.100.1")).status).toBe(200);
    const repeat = await post(game, "198.51.100.1");
    expect(repeat.status).toBe(409);
    expect(await repeat.json()).toEqual({ error: "already recorded" });
    expect(store.recordGame).toHaveBeenCalledTimes(1);
  });

  test("accepts same game from different client", async () => {
    const game = { moves: MODEL_WIN, result: "model" };
    expect((await post(game, "198.51.100.3")).status).toBe(200);
    expect((await post(game, "198.51.100.4")).status).toBe(200);
  });

  test("does not deduplicate rejected game", async () => {
    const bad = { moves: [0, 0, 0, 0, 0, 0, 0], result: "draw" };
    expect((await post(bad, "198.51.100.5")).status).toBe(400);
    expect((await post(bad, "198.51.100.5")).status).toBe(400);
  });

  test("accepts retry after insert failure", async () => {
    spyOn(store, "recordGame").mockRejectedValueOnce(new Error("insert failed"));
    const game = { moves: HUMAN_WIN, result: "human" };
    expect((await post(game, "198.51.100.6")).status).toBe(500);
    expect((await post(game, "198.51.100.6")).status).toBe(200);
  });

  test("returns 409 for retry after stats failure", async () => {
    spyOn(store, "getStats").mockRejectedValueOnce(new Error("stats failed"));
    const game = { moves: HUMAN_WIN, result: "human" };
    expect((await post(game, "198.51.100.7")).status).toBe(500);
    expect((await post(game, "198.51.100.7")).status).toBe(409);
  });
});
