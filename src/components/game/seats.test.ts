import { describe, expect, test } from "bun:test";
import { FIRST, SECOND } from "./engine";
import {
  INK_SEAT,
  RED_SEAT,
  SEAT_GRACE_MS,
  SPECTATOR,
  assignSeats,
  canAct,
  colorOf,
  holdingSeats,
  nextExpiry,
  seatOf,
  seatOrder,
  withSelf,
  type Sighting,
} from "./seats";

const at = (clientId: string, since: number): { clientId: string; since: number } => ({ clientId, since });
const seen = (clientId: string, since: number, lastSeen: number): Sighting => ({ clientId, since, lastSeen });

describe("seatOrder", () => {
  test("sorts by join time", () => {
    expect(seatOrder([at("c", 30), at("a", 10), at("b", 20)]).map((o) => o.clientId)).toEqual(["a", "b", "c"]);
  });

  test("breaks ties by client id", () => {
    expect(seatOrder([at("z", 5), at("a", 5)]).map((o) => o.clientId)).toEqual(["a", "z"]);
  });

  test("compares client ids by code unit", () => {
    expect(seatOrder([at("a", 5), at("B", 5)]).map((o) => o.clientId)).toEqual(["B", "a"]);
    expect(seatOrder([at("z", 5), at("aa", 5)]).map((o) => o.clientId)).toEqual(["aa", "z"]);
  });

  test("does not mutate input", () => {
    const input = [at("b", 2), at("a", 1)];
    seatOrder(input);
    expect(input.map((o) => o.clientId)).toEqual(["b", "a"]);
  });

  test("produces order-independent seating", () => {
    const people = [at("a", 10), at("b", 20), at("c", 30)];
    const shuffled = [people[2], people[0], people[1]];
    expect(assignSeats(shuffled)).toEqual(assignSeats(people));
  });
});

describe("assignSeats", () => {
  test("returns empty seats for no clients", () => {
    expect(assignSeats([])).toEqual({ ink: null, red: null, spectators: [] });
  });

  test("assigns ink to single client", () => {
    expect(assignSeats([at("a", 1)])).toEqual({ ink: "a", red: null, spectators: [] });
  });

  test("assigns ink and red to two clients", () => {
    expect(assignSeats([at("a", 1), at("b", 2)])).toEqual({ ink: "a", red: "b", spectators: [] });
  });

  test("assigns spectators after two clients", () => {
    const seats = assignSeats([at("a", 1), at("b", 2), at("c", 3), at("d", 4)]);
    expect(seats.ink).toBe("a");
    expect(seats.red).toBe("b");
    expect(seats.spectators).toEqual(["c", "d"]);
  });

  test("assigns each client one seat", () => {
    const seats = assignSeats([at("a", 1), at("b", 2), at("c", 3)]);
    const held = [seats.ink, seats.red, ...seats.spectators].filter(Boolean);
    expect(new Set(held).size).toBe(held.length);
  });
});

describe("seatOf and colorOf", () => {
  const seats = assignSeats([at("a", 1), at("b", 2), at("c", 3)]);

  test("returns seat for each client", () => {
    expect(seatOf(seats, "a")).toBe(INK_SEAT);
    expect(seatOf(seats, "b")).toBe(RED_SEAT);
    expect(seatOf(seats, "c")).toBe(SPECTATOR);
    expect(seatOf(seats, "nobody")).toBe(SPECTATOR);
  });

  test("returns null color for spectator", () => {
    expect(colorOf(SPECTATOR, true)).toBeNull();
    expect(colorOf(SPECTATOR, false)).toBeNull();
  });

  test("alternates colors by round", () => {
    expect(colorOf(INK_SEAT, true)).toBe(FIRST);
    expect(colorOf(RED_SEAT, true)).toBe(SECOND);
    expect(colorOf(INK_SEAT, false)).toBe(SECOND);
    expect(colorOf(RED_SEAT, false)).toBe(FIRST);
  });
});

describe("holdingSeats", () => {
  const present = (...ids: string[]) => new Set(ids);

  test("retains connected clients", () => {
    const sightings = [seen("a", 1, 0), seen("b", 2, 0)];
    expect(holdingSeats(sightings, present("a", "b"), 1_000_000).map((o) => o.clientId)).toEqual(["a", "b"]);
  });

  test("retains disconnected player within grace period", () => {
    const now = 100_000;
    const sightings = [seen("a", 1, now), seen("b", 2, now - (SEAT_GRACE_MS - 1)), seen("c", 3, now)];
    const holders = holdingSeats(sightings, present("a", "c"), now).map((o) => o.clientId);
    expect(holders).toContain("b");
    expect(assignSeats(holdingSeats(sightings, present("a", "c"), now)).red).toBe("b");
  });

  test("promotes earliest spectator after grace period", () => {
    const now = 100_000;
    const sightings = [seen("a", 1, now), seen("b", 2, now - SEAT_GRACE_MS), seen("c", 3, now)];
    const seats = assignSeats(holdingSeats(sightings, present("a", "c"), now));
    expect(seats.ink).toBe("a");
    expect(seats.red).toBe("c");
    expect(seats.spectators).toEqual([]);
  });

  test("promotes one spectator per vacated seat", () => {
    const now = 100_000;
    const sightings = [seen("a", 1, now), seen("b", 2, now - SEAT_GRACE_MS), seen("c", 3, now), seen("d", 4, now)];
    const seats = assignSeats(holdingSeats(sightings, present("a", "c", "d"), now));
    expect(seats.red).toBe("c");
    expect(seats.spectators).toEqual(["d"]);
  });

  test("restores returning player by join time", () => {
    const now = 100_000;
    const sightings = [seen("a", 1, now), seen("b", 2, now), seen("c", 3, now)];
    expect(assignSeats(holdingSeats(sightings, present("a", "b", "c"), now)).red).toBe("b");
  });
});

describe("nextExpiry", () => {
  test("returns null when all clients connected", () => {
    expect(nextExpiry([seen("a", 1, 0)], new Set(["a"]), 50_000)).toBeNull();
  });

  test("returns time until earliest expiry", () => {
    const now = 100_000;
    const sightings = [seen("b", 2, now - 10_000), seen("c", 3, now - 20_000)];
    expect(nextExpiry(sightings, new Set(), now)).toBe(SEAT_GRACE_MS - 20_000);
  });

  test("ignores expired grace periods", () => {
    const now = 100_000;
    expect(nextExpiry([seen("b", 2, now - SEAT_GRACE_MS * 2)], new Set(), now)).toBeNull();
  });
});

describe("holdingSeats after both players leave", () => {
  const now = 200_000;
  const gone = now - SEAT_GRACE_MS;

  test("keeps spectators during grace period", () => {
    const sightings = [seen("a", 1, now - 1), seen("b", 2, now - 1), seen("c", 3, now), seen("d", 4, now)];
    const seats = assignSeats(holdingSeats(sightings, new Set(["c", "d"]), now));
    expect(seats.ink).toBe("a");
    expect(seats.red).toBe("b");
    expect(seats.spectators).toEqual(["c", "d"]);
  });

  test("promotes two earliest spectators after grace period", () => {
    const sightings = [seen("a", 1, gone), seen("b", 2, gone), seen("c", 3, now), seen("d", 4, now)];
    const seats = assignSeats(holdingSeats(sightings, new Set(["c", "d"]), now));
    expect(seats.ink).toBe("c");
    expect(seats.red).toBe("d");
    expect(seats.spectators).toEqual([]);
  });

  test("assigns ink to sole remaining spectator", () => {
    const sightings = [seen("a", 1, gone), seen("b", 2, gone), seen("c", 3, now)];
    const seats = assignSeats(holdingSeats(sightings, new Set(["c"]), now));
    expect(seats.ink).toBe("c");
    expect(seats.red).toBeNull();
    expect(seats.spectators).toEqual([]);
  });

  test("returns empty seats for empty room", () => {
    const sightings = [seen("a", 1, gone), seen("b", 2, gone)];
    expect(assignSeats(holdingSeats(sightings, new Set(), now))).toEqual({ ink: null, red: null, spectators: [] });
  });

  test("promotes spectators by join time", () => {
    const sightings = [seen("a", 1, gone), seen("b", 2, gone), seen("d", 40, now), seen("c", 30, now)];
    const seats = assignSeats(holdingSeats(sightings, new Set(["c", "d"]), now));
    expect(seats.ink).toBe("c");
    expect(seats.red).toBe("d");
  });
});

describe("canAct", () => {
  test("returns true for seated players", () => {
    expect(canAct(INK_SEAT)).toBe(true);
    expect(canAct(RED_SEAT)).toBe(true);
  });

  test("returns false for spectator", () => {
    expect(canAct(SPECTATOR)).toBe(false);
  });
});

describe("withSelf", () => {
  const me = at("me", 50);

  test("adds self when absent from presence", () => {
    expect(withSelf([], me)).toEqual([me]);
    expect(assignSeats(withSelf([], me)).ink).toBe("me");
  });

  test("assigns ink to sole client", () => {
    expect(seatOf(assignSeats(withSelf([], me)), "me")).toBe(INK_SEAT);
  });

  test("assigns red to second client before presence sync", () => {
    const seats = assignSeats(withSelf([at("host", 10)], me));
    expect(seats.ink).toBe("host");
    expect(seatOf(seats, "me")).toBe(RED_SEAT);
  });

  test("does not duplicate self", () => {
    const already = [at("host", 10), me];
    expect(withSelf(already, me)).toHaveLength(2);
    expect(assignSeats(withSelf(already, me)).red).toBe("me");
  });

  test("assigns spectator to third client", () => {
    const seats = assignSeats(withSelf([at("host", 10), at("guest", 20)], me));
    expect(seatOf(seats, "me")).toBe(SPECTATOR);
  });

  test("preserves earlier player seat", () => {
    const seats = assignSeats(withSelf([at("host", 10)], me));
    expect(seats.ink).toBe("host");
  });
});
