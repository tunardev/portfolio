import { describe, expect, test } from "bun:test";
import { COLS } from "./engine";
import { SEAT_GRACE_MS } from "./seats";
import { claimIdentity, connect, isAhead, toSync } from "./useMatch";

const EMPTY_SYNC = { moves: [], round: 0 };

describe("toSync", () => {
  test("returns valid payload unchanged", () => {
    expect(toSync({ moves: [3, 0, 6], round: 2 })).toEqual({ moves: [3, 0, 6], round: 2 });
  });

  test("preserves empty moves with round", () => {
    expect(toSync({ moves: [], round: 4 })).toEqual({ moves: [], round: 4 });
  });

  test("strips unknown fields", () => {
    expect(toSync({ moves: [1], round: 0, winner: "them", seat: "host" })).toEqual({ moves: [1], round: 0 });
  });

  test("returns empty sync for non-object input", () => {
    expect(toSync(null)).toEqual(EMPTY_SYNC);
    expect(toSync(undefined)).toEqual(EMPTY_SYNC);
    expect(toSync("moves")).toEqual(EMPTY_SYNC);
    expect(toSync(7)).toEqual(EMPTY_SYNC);
    expect(toSync(0)).toEqual(EMPTY_SYNC);
    expect(toSync([3, 0, 6])).toEqual(EMPTY_SYNC);
    expect(toSync(true)).toEqual(EMPTY_SYNC);
  });

  test("returns empty sync for non-array moves", () => {
    expect(toSync({ moves: "3,0,6", round: 1 })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: { 0: 3 }, round: 1 })).toEqual(EMPTY_SYNC);
    expect(toSync({ round: 1 })).toEqual(EMPTY_SYNC);
  });

  test("returns empty sync for non-number round", () => {
    expect(toSync({ moves: [3], round: "1" })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [3], round: null })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [3] })).toEqual(EMPTY_SYNC);
  });

  test("returns empty sync for non-integer or negative round", () => {
    expect(toSync({ moves: [1, 2], round: 0.5 })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [1, 2], round: -3 })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [1], round: Number.NaN })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [1], round: Number.POSITIVE_INFINITY })).toEqual(EMPTY_SYNC);
  });

  test("drops out-of-range columns", () => {
    expect(toSync({ moves: [-1, 0, COLS, 6, COLS + 4], round: 1 })).toEqual({ moves: [0, 6], round: 1 });
  });

  test("drops non-integer columns", () => {
    expect(toSync({ moves: [2.5, 3, Number.NaN, Number.POSITIVE_INFINITY, 4], round: 1 })).toEqual({
      moves: [3, 4],
      round: 1,
    });
  });

  test("drops non-number moves", () => {
    expect(toSync({ moves: ["3", null, undefined, {}, [2], true, 5], round: 1 })).toEqual({ moves: [5], round: 1 });
  });
});

describe("isAhead", () => {
  test("prefers higher round", () => {
    expect(isAhead({ moves: [], round: 2 }, { moves: [1, 2, 3, 4], round: 1 })).toBe(true);
    expect(isAhead({ moves: [1, 2, 3, 4], round: 1 }, { moves: [], round: 2 })).toBe(false);
  });

  test("prefers longer moves at equal round", () => {
    expect(isAhead({ moves: [1, 2], round: 3 }, { moves: [1], round: 3 })).toBe(true);
    expect(isAhead({ moves: [1], round: 3 }, { moves: [1, 2], round: 3 })).toBe(false);
  });

  test("returns false for equal round and length", () => {
    expect(isAhead({ moves: [1, 2], round: 3 }, { moves: [4, 5], round: 3 })).toBe(false);
    expect(isAhead(EMPTY_SYNC, EMPTY_SYNC)).toBe(false);
  });
});

describe("claimIdentity without storage", () => {
  test("returns stable client id", () => {
    const first = claimIdentity("no-storage-a", 1_000);
    const again = claimIdentity("no-storage-a", 2_000);
    expect(again.clientId).toBe(first.clientId);
  });

  test("preserves join time within grace period", () => {
    const first = claimIdentity("no-storage-b", 1_000);
    expect(claimIdentity("no-storage-b", 1_000 + SEAT_GRACE_MS - 1).since).toBe(first.since);
  });

  test("resets join time after grace period", () => {
    claimIdentity("no-storage-c", 1_000);
    const later = 1_000 + SEAT_GRACE_MS;
    expect(claimIdentity("no-storage-c", later).since).toBe(later);
  });

  test("returns distinct client ids per match", () => {
    expect(claimIdentity("no-storage-d").clientId).not.toBe(claimIdentity("no-storage-e").clientId);
  });
});

describe("connect on realtime client load failure", () => {
  const me = { clientId: "me", since: 1 };
  const failedLoad = () => Promise.reject(new Error("chunk failed to load"));
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  const listen = () => {
    const calls = { unavailable: 0, ready: 0 };
    const listeners = {
      onChannel: () => {},
      onPresence: () => {},
      onReady: () => {
        calls.ready += 1;
      },
      onUnavailable: () => {
        calls.unavailable += 1;
      },
    };
    return { calls, listeners };
  };

  test("calls onUnavailable", async () => {
    const { calls, listeners } = listen();
    const stop = connect("load-fails", me, listeners, failedLoad);
    await settle();
    expect(calls).toEqual({ unavailable: 1, ready: 0 });
    stop();
  });

  test("calls no listeners after cleanup", async () => {
    const { calls, listeners } = listen();
    connect("load-fails-late", me, listeners, failedLoad)();
    await settle();
    expect(calls).toEqual({ unavailable: 0, ready: 0 });
  });
});
