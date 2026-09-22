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

describe("POST rejects malformed bodies", () => {
  test("a body that is not json at all is rejected", async () => {
    const response = await postRaw("this is not json");
    expect(response.status).toBe(400);
  });

  test("an empty body is rejected", async () => {
    const response = await postRaw("");
    expect(response.status).toBe(400);
  });

  test("a json null body is rejected", async () => {
    const response = await post(null);
    expect(response.status).toBe(400);
  });

  test("a json string body is rejected", async () => {
    const response = await post("moves");
    expect(response.status).toBe(400);
  });

  test("the rejection body carries a generic message", async () => {
    const response = await postRaw("this is not json");
    expect(await response.json()).toEqual({ error: "bad game" });
  });
});

describe("POST rejects bad move lists", () => {
  test("a body with no moves is rejected", async () => {
    const response = await post({ result: "human" });
    expect(response.status).toBe(400);
  });

  test("moves that are not an array are rejected", async () => {
    const response = await post({ moves: "0,1,2", result: "human" });
    expect(response.status).toBe(400);
  });

  test("moves given as an object are rejected", async () => {
    const response = await post({ moves: { 0: 3 }, result: "human" });
    expect(response.status).toBe(400);
  });

  test("an empty move list is rejected", async () => {
    const response = await post({ moves: [], result: "human" });
    expect(response.status).toBe(400);
  });

  test("a move list longer than the board is rejected", async () => {
    const moves = Array.from({ length: SLOTS + 1 }, (_, i) => i % COLS);
    const response = await post({ moves, result: "draw" });
    expect(response.status).toBe(400);
  });
});

describe("POST rejects bad columns", () => {
  const cases: [string, unknown][] = [
    ["a negative column", -1],
    ["a column equal to the column count", COLS],
    ["a column past the column count", 99],
    ["a non-integer column", 2.5],
    ["a numeric string column", "3"],
    ["a null column", null],
    ["a boolean column", true],
    ["a not-a-number column", Number.NaN],
    ["an infinite column", Number.POSITIVE_INFINITY],
  ];

  for (const [label, col] of cases) {
    test(`${label} is rejected`, async () => {
      const response = await post({ moves: [...HUMAN_WIN.slice(0, -1), col], result: "human" });
      expect(response.status).toBe(400);
    });
  }
});

describe("POST rejects bad results", () => {
  test("a missing result is rejected", async () => {
    const response = await post({ moves: HUMAN_WIN });
    expect(response.status).toBe(400);
  });

  test("an unknown result is rejected", async () => {
    const response = await post({ moves: HUMAN_WIN, result: "model_won" });
    expect(response.status).toBe(400);
  });

  test("a result with the wrong case is rejected", async () => {
    const response = await post({ moves: HUMAN_WIN, result: "Human" });
    expect(response.status).toBe(400);
  });

  test("a non-string result is rejected", async () => {
    const response = await post({ moves: HUMAN_WIN, result: 1 });
    expect(response.status).toBe(400);
  });
});

describe("POST rejects a result the board does not show", () => {
  const cases: [string, number[], string][] = [
    ["a human win claimed as a model win", HUMAN_WIN, "model"],
    ["a human win claimed as a draw", HUMAN_WIN, "draw"],
    ["a model win claimed as a human win", MODEL_WIN, "human"],
    ["a full board claimed as a human win", DRAWN_GAME, "human"],
    ["an unfinished game claimed as a draw", [3], "draw"],
    ["an unfinished game claimed as a human win", [3, 3, 4], "human"],
  ];

  for (const [label, moves, result] of cases) {
    test(`${label} is rejected`, async () => {
      const response = await post({ moves, result });
      expect(response.status).toBe(400);
    });
  }
});

describe("POST rejects unplayable games", () => {
  test("a move into a full column is rejected", async () => {
    const response = await post({ moves: [0, 0, 0, 0, 0, 0, 0], result: "draw" });
    expect(response.status).toBe(400);
  });

  test("a move into a full column is rejected even when skipping it would leave a finished game", async () => {
    const response = await post({ moves: [0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 2, 1, 2, 1], result: "model" });
    expect(response.status).toBe(400);
  });

  test("a move into a column filled earlier in a drawn game is rejected", async () => {
    const response = await post({
      moves: [...DRAWN_GAME.slice(0, 20), 3, ...DRAWN_GAME.slice(20, 22)],
      result: "model",
    });
    expect(response.status).toBe(400);
  });

  test("moves that continue after a win are rejected", async () => {
    const response = await post({ moves: [...HUMAN_WIN, 1], result: "human" });
    expect(response.status).toBe(400);
  });

  test("many moves that continue after a win are rejected", async () => {
    const response = await post({ moves: [...HUMAN_WIN, 1, 2, 3, 4], result: "human" });
    expect(response.status).toBe(400);
  });

  test("a horizontal win followed by more moves is rejected", async () => {
    const response = await post({ moves: [0, 0, 1, 1, 2, 2, 3, 3], result: "human" });
    expect(response.status).toBe(400);
  });
});

describe("POST accepts finished games", () => {
  test("a human win passes validation", async () => {
    const response = await post({ moves: HUMAN_WIN, result: "human" });
    expect(response.status).not.toBe(400);
  });

  test("a model win passes validation", async () => {
    const response = await post({ moves: MODEL_WIN, result: "model" });
    expect(response.status).not.toBe(400);
  });

  test("a drawn game filling every slot passes validation", async () => {
    expect(DRAWN_GAME).toHaveLength(SLOTS);
    const response = await post({ moves: DRAWN_GAME, result: "draw" });
    expect(response.status).not.toBe(400);
  });

  test("a valid game with no database configured fails as a server error", async () => {
    const response = await post({ moves: HUMAN_WIN, result: "human" });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "something went wrong" });
  });
});

describe("GET fails safely without a database", () => {
  test("it returns a server error rather than throwing", async () => {
    const response = await GET();
    expect(response.status).toBe(500);
  });

  test("it returns the generic message", async () => {
    const response = await GET();
    expect(await response.json()).toEqual({ error: "something went wrong" });
  });

  test("it leaks no supabase or postgres detail", async () => {
    const body = (await (await GET()).text()).toLowerCase();
    for (const leak of ["supabase", "postgres", "pgrst", "service_role", "anon key", "http://", "https://"]) {
      expect(body).not.toContain(leak);
    }
  });
});

describe("POST rate limits a single client", () => {
  test("requests up to the limit are not rate limited", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const response = await post({ moves: humanWin(i), result: "human" }, "203.0.113.10");
      expect(response.status).not.toBe(429);
    }
  });

  test("the request past the limit is rejected with 429", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      await post({ moves: humanWin(i), result: "human" }, "203.0.113.11");
    }
    const response = await post({ moves: MODEL_WIN, result: "model" }, "203.0.113.11");
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "too many games" });
  });

  test("a rate limited response carries a positive retry-after header", async () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) {
      await post({ moves: humanWin(i), result: "human" }, "203.0.113.12");
    }
    const response = await post({ moves: MODEL_WIN, result: "model" }, "203.0.113.12");
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  test("a malformed body still counts against the limit", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect((await postRaw("not json", "203.0.113.13")).status).toBe(400);
    }
    expect((await postRaw("not json", "203.0.113.13")).status).toBe(429);
  });

  test("clients are limited independently", async () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) {
      await post({ moves: humanWin(i), result: "human" }, "203.0.113.14");
    }
    expect((await post({ moves: MODEL_WIN, result: "model" }, "203.0.113.14")).status).toBe(429);
    expect((await post({ moves: MODEL_WIN, result: "model" }, "203.0.113.15")).status).not.toBe(429);
  });
});

describe("POST refuses duplicate submissions", () => {
  beforeEach(() => {
    spyOn(store, "recordGame").mockResolvedValue(undefined);
    spyOn(store, "getStats").mockResolvedValue(STATS);
  });

  test("a recorded game answers with fresh stats", async () => {
    const response = await post({ moves: HUMAN_WIN, result: "human" }, "198.51.100.1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(STATS);
  });

  test("the same game from the same client is rejected the second time", async () => {
    const game = { moves: HUMAN_WIN, result: "human" };
    expect((await post(game, "198.51.100.1")).status).toBe(200);
    const repeat = await post(game, "198.51.100.1");
    expect(repeat.status).toBe(409);
    expect(await repeat.json()).toEqual({ error: "already recorded" });
    expect(store.recordGame).toHaveBeenCalledTimes(1);
  });

  test("the same game from a different client is not a duplicate", async () => {
    const game = { moves: MODEL_WIN, result: "model" };
    expect((await post(game, "198.51.100.3")).status).toBe(200);
    expect((await post(game, "198.51.100.4")).status).toBe(200);
  });

  test("a rejected game is never recorded as seen", async () => {
    const bad = { moves: [0, 0, 0, 0, 0, 0, 0], result: "draw" };
    expect((await post(bad, "198.51.100.5")).status).toBe(400);
    expect((await post(bad, "198.51.100.5")).status).toBe(400);
  });

  test("a game whose insert failed can be sent again", async () => {
    spyOn(store, "recordGame").mockRejectedValueOnce(new Error("insert failed"));
    const game = { moves: HUMAN_WIN, result: "human" };
    expect((await post(game, "198.51.100.6")).status).toBe(500);
    expect((await post(game, "198.51.100.6")).status).toBe(200);
  });

  test("a game that was stored but whose stats failed is still a duplicate", async () => {
    spyOn(store, "getStats").mockRejectedValueOnce(new Error("stats failed"));
    const game = { moves: HUMAN_WIN, result: "human" };
    expect((await post(game, "198.51.100.7")).status).toBe(500);
    expect((await post(game, "198.51.100.7")).status).toBe(409);
  });
});
