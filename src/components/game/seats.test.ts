import { describe, expect, test } from "bun:test";
import { FIRST, SECOND } from "./engine";
import {
  SEAT_GRACE_MS,
  assignSeats,
  colorOf,
  holdingSeats,
  nextExpiry,
  seatOf,
  seatOrder,
  type Sighting,
} from "./seats";

const at = (clientId: string, since: number): { clientId: string; since: number } => ({ clientId, since });
const seen = (clientId: string, since: number, lastSeen: number): Sighting => ({ clientId, since, lastSeen });

describe("seatOrder is deterministic", () => {
  test("orders by first-join time", () => {
    expect(seatOrder([at("c", 30), at("a", 10), at("b", 20)]).map((o) => o.clientId)).toEqual(["a", "b", "c"]);
  });

  test("breaks ties on client id so every client agrees", () => {
    expect(seatOrder([at("z", 5), at("a", 5)]).map((o) => o.clientId)).toEqual(["a", "z"]);
  });

  test("does not mutate the input", () => {
    const input = [at("b", 2), at("a", 1)];
    seatOrder(input);
    expect(input.map((o) => o.clientId)).toEqual(["b", "a"]);
  });

  test("the same set in any order yields the same seating", () => {
    const people = [at("a", 10), at("b", 20), at("c", 30)];
    const shuffled = [people[2], people[0], people[1]];
    expect(assignSeats(shuffled)).toEqual(assignSeats(people));
  });
});

describe("assignSeats gives two seats and everyone else watches", () => {
  test("nobody present leaves both seats empty", () => {
    expect(assignSeats([])).toEqual({ ink: null, red: null, spectators: [] });
  });

  test("one person takes ink and waits", () => {
    expect(assignSeats([at("a", 1)])).toEqual({ ink: "a", red: null, spectators: [] });
  });

  test("two people fill both seats", () => {
    expect(assignSeats([at("a", 1), at("b", 2)])).toEqual({ ink: "a", red: "b", spectators: [] });
  });

  test("the third and everyone after are spectators", () => {
    const seats = assignSeats([at("a", 1), at("b", 2), at("c", 3), at("d", 4)]);
    expect(seats.ink).toBe("a");
    expect(seats.red).toBe("b");
    expect(seats.spectators).toEqual(["c", "d"]);
  });

  test("no client ever holds two seats", () => {
    const seats = assignSeats([at("a", 1), at("b", 2), at("c", 3)]);
    const held = [seats.ink, seats.red, ...seats.spectators].filter(Boolean);
    expect(new Set(held).size).toBe(held.length);
  });
});

describe("seatOf and colorOf", () => {
  const seats = assignSeats([at("a", 1), at("b", 2), at("c", 3)]);

  test("reports the seat each client holds", () => {
    expect(seatOf(seats, "a")).toBe("ink");
    expect(seatOf(seats, "b")).toBe("red");
    expect(seatOf(seats, "c")).toBe("spectator");
    expect(seatOf(seats, "nobody")).toBe("spectator");
  });

  test("a spectator never gets a colour", () => {
    expect(colorOf("spectator", true)).toBeNull();
    expect(colorOf("spectator", false)).toBeNull();
  });

  test("colours swap with the round so rematches alternate", () => {
    expect(colorOf("ink", true)).toBe(FIRST);
    expect(colorOf("red", true)).toBe(SECOND);
    expect(colorOf("ink", false)).toBe(SECOND);
    expect(colorOf("red", false)).toBe(FIRST);
  });
});

describe("a vacated seat is held for the grace period", () => {
  const present = (...ids: string[]) => new Set(ids);

  test("someone still connected always holds their seat", () => {
    const sightings = [seen("a", 1, 0), seen("b", 2, 0)];
    expect(holdingSeats(sightings, present("a", "b"), 1_000_000).map((o) => o.clientId)).toEqual(["a", "b"]);
  });

  test("a disconnected player keeps the seat inside the grace window", () => {
    const now = 100_000;
    const sightings = [seen("a", 1, now), seen("b", 2, now - (SEAT_GRACE_MS - 1)), seen("c", 3, now)];
    const holders = holdingSeats(sightings, present("a", "c"), now).map((o) => o.clientId);
    expect(holders).toContain("b");
    expect(assignSeats(holdingSeats(sightings, present("a", "c"), now)).red).toBe("b");
  });

  test("the seat opens to the longest-waiting spectator once the grace expires", () => {
    const now = 100_000;
    const sightings = [seen("a", 1, now), seen("b", 2, now - SEAT_GRACE_MS), seen("c", 3, now)];
    const seats = assignSeats(holdingSeats(sightings, present("a", "c"), now));
    expect(seats.ink).toBe("a");
    expect(seats.red).toBe("c");
    expect(seats.spectators).toEqual([]);
  });

  test("only one spectator is ever promoted", () => {
    const now = 100_000;
    const sightings = [seen("a", 1, now), seen("b", 2, now - SEAT_GRACE_MS), seen("c", 3, now), seen("d", 4, now)];
    const seats = assignSeats(holdingSeats(sightings, present("a", "c", "d"), now));
    expect(seats.red).toBe("c");
    expect(seats.spectators).toEqual(["d"]);
  });

  test("a returning player reclaims the seat because their join time is older", () => {
    const now = 100_000;
    const sightings = [seen("a", 1, now), seen("b", 2, now), seen("c", 3, now)];
    expect(assignSeats(holdingSeats(sightings, present("a", "b", "c"), now)).red).toBe("b");
  });
});

describe("nextExpiry schedules the next seat change", () => {
  test("returns null when everyone is connected", () => {
    expect(nextExpiry([seen("a", 1, 0)], new Set(["a"]), 50_000)).toBeNull();
  });

  test("returns the time remaining on the soonest grace", () => {
    const now = 100_000;
    const sightings = [seen("b", 2, now - 10_000), seen("c", 3, now - 20_000)];
    expect(nextExpiry(sightings, new Set(), now)).toBe(SEAT_GRACE_MS - 20_000);
  });

  test("ignores graces that have already run out", () => {
    const now = 100_000;
    expect(nextExpiry([seen("b", 2, now - SEAT_GRACE_MS * 2)], new Set(), now)).toBeNull();
  });
});
