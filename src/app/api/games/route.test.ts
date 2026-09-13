import { beforeEach, describe, expect, test } from "bun:test";
import { COLS, SLOTS } from "@/components/game/engine";
import { RATE_LIMIT_MAX, resetLimits } from "@/lib/limits";
import { GET, POST } from "./route";

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("refusing to run: test-setup.ts did not scrub the database credentials");
}

beforeEach(() => {
  resetLimits();
});

function postRaw(body: string, client?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (client) headers["x-forwarded-for"] = client;
  return POST(new Request("http://localhost/api/games", { method: "POST", headers, body }));
}

function post(body: unknown, client?: string) {
  return postRaw(JSON.stringify(body), client);
}

function uniqueGame(seed: number) {
  return [seed % COLS, (seed + 1) % COLS, seed % COLS];
}

const WINNING_GAME = [0, 1, 0, 1, 0, 1, 0];

const DRAWN_GAME = [
  3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 0, 1, 1, 1, 1, 1, 1, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0, 6, 6, 6,
  6, 6, 6,
];

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
    expect(moves).toHaveLength(43);
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
      const response = await post({ moves: [col], result: "human" });
      expect(response.status).toBe(400);
    });
  }

  test("one bad column poisons an otherwise valid game", async () => {
    const response = await post({ moves: [...WINNING_GAME, COLS], result: "human" });
    expect(response.status).toBe(400);
  });
});

describe("POST rejects bad results", () => {
  test("a missing result is rejected", async () => {
    const response = await post({ moves: WINNING_GAME });
    expect(response.status).toBe(400);
  });

  test("an unknown result is rejected", async () => {
    const response = await post({ moves: WINNING_GAME, result: "model_won" });
    expect(response.status).toBe(400);
  });

  test("a result with the wrong case is rejected", async () => {
    const response = await post({ moves: WINNING_GAME, result: "Human" });
    expect(response.status).toBe(400);
  });

  test("a non-string result is rejected", async () => {
    const response = await post({ moves: WINNING_GAME, result: 1 });
    expect(response.status).toBe(400);
  });
});

describe("POST rejects unplayable games", () => {
  test("a move into a full column is rejected", async () => {
    const response = await post({ moves: [0, 0, 0, 0, 0, 0, 0], result: "draw" });
    expect(response.status).toBe(400);
  });

  test("a move into a full column is rejected even after play moves elsewhere", async () => {
    const response = await post({ moves: [0, 0, 0, 0, 0, 0, 1, 0], result: "draw" });
    expect(response.status).toBe(400);
  });

  test("a move into a column filled earlier in a drawn game is rejected", async () => {
    const response = await post({ moves: [...DRAWN_GAME.slice(0, 20), 3], result: "draw" });
    expect(response.status).toBe(400);
  });

  test("moves that continue after a win are rejected", async () => {
    const response = await post({ moves: [...WINNING_GAME, 1], result: "human" });
    expect(response.status).toBe(400);
  });

  test("many moves that continue after a win are rejected", async () => {
    const response = await post({ moves: [...WINNING_GAME, 1, 2, 3, 4], result: "human" });
    expect(response.status).toBe(400);
  });

  test("a horizontal win followed by more moves is rejected", async () => {
    const response = await post({ moves: [0, 0, 1, 1, 2, 2, 3, 3], result: "human" });
    expect(response.status).toBe(400);
  });
});

describe("POST accepts well-formed games", () => {
  test("a game won on the last move passes validation", async () => {
    const response = await post({ moves: WINNING_GAME, result: "human" });
    expect(response.status).not.toBe(400);
  });

  test("a single opening move passes validation", async () => {
    const response = await post({ moves: [3], result: "draw" });
    expect(response.status).not.toBe(400);
  });

  test("a drawn game filling every slot passes validation", async () => {
    expect(DRAWN_GAME).toHaveLength(SLOTS);
    const response = await post({ moves: DRAWN_GAME, result: "draw" });
    expect(response.status).not.toBe(400);
  });

  test("each allowed result passes validation", async () => {
    for (const result of ["human", "model", "draw"]) {
      const response = await post({ moves: WINNING_GAME, result });
      expect(response.status).not.toBe(400);
    }
  });

  test("a valid game with no database configured fails as a server error", async () => {
    const response = await post({ moves: WINNING_GAME, result: "human" });
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
      const response = await post({ moves: uniqueGame(i), result: "draw" }, "203.0.113.10");
      expect(response.status).not.toBe(429);
    }
  });

  test("the request past the limit is rejected with 429", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      await post({ moves: uniqueGame(i), result: "draw" }, "203.0.113.11");
    }
    const response = await post({ moves: [1], result: "draw" }, "203.0.113.11");
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "too many games" });
  });

  test("a rate limited response carries a positive retry-after header", async () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) {
      await post({ moves: uniqueGame(i), result: "draw" }, "203.0.113.12");
    }
    const response = await post({ moves: [1], result: "draw" }, "203.0.113.12");
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
      await post({ moves: uniqueGame(i), result: "draw" }, "203.0.113.14");
    }
    expect((await post({ moves: [1], result: "draw" }, "203.0.113.14")).status).toBe(429);
    expect((await post({ moves: [1], result: "draw" }, "203.0.113.15")).status).not.toBe(429);
  });
});

describe("POST refuses duplicate submissions", () => {
  test("the same game from the same client is rejected the second time", async () => {
    const game = { moves: [0, 1, 0, 1, 0, 1, 0], result: "human" };
    expect((await post(game, "198.51.100.1")).status).not.toBe(409);
    const repeat = await post(game, "198.51.100.1");
    expect(repeat.status).toBe(409);
    expect(await repeat.json()).toEqual({ error: "already recorded" });
  });

  test("the same moves with a different result are not a duplicate", async () => {
    const moves = [0, 1, 2, 3];
    expect((await post({ moves, result: "human" }, "198.51.100.2")).status).not.toBe(409);
    expect((await post({ moves, result: "draw" }, "198.51.100.2")).status).not.toBe(409);
  });

  test("the same game from a different client is not a duplicate", async () => {
    const game = { moves: [3, 3, 4], result: "draw" };
    expect((await post(game, "198.51.100.3")).status).not.toBe(409);
    expect((await post(game, "198.51.100.4")).status).not.toBe(409);
  });

  test("a rejected game is never recorded as seen", async () => {
    const bad = { moves: [0, 0, 0, 0, 0, 0, 0], result: "draw" };
    expect((await post(bad, "198.51.100.5")).status).toBe(400);
    expect((await post(bad, "198.51.100.5")).status).toBe(400);
  });
});
