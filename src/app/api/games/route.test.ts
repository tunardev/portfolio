import { describe, expect, test } from "bun:test";
import { COLS, SLOTS } from "@/components/game/engine";
import { GET, POST } from "./route";

for (const key of ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  delete process.env[key];
}

function postRaw(body: string) {
  return POST(
    new Request("http://localhost/api/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
}

function post(body: unknown) {
  return postRaw(JSON.stringify(body));
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
