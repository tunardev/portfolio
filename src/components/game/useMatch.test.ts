import { describe, expect, test } from "bun:test";
import { COLS } from "./engine";
import { SEAT_GRACE_MS } from "./seats";
import { claimIdentity, connect, isAhead, toSync } from "./useMatch";

const EMPTY_SYNC = { moves: [], round: 0 };

describe("toSync", () => {
  test("passes a well formed payload through", () => {
    expect(toSync({ moves: [3, 0, 6], round: 2 })).toEqual({ moves: [3, 0, 6], round: 2 });
  });

  test("keeps an empty move list alongside a real round", () => {
    expect(toSync({ moves: [], round: 4 })).toEqual({ moves: [], round: 4 });
  });

  test("ignores extra fields a peer tacks on", () => {
    expect(toSync({ moves: [1], round: 0, winner: "them", seat: "host" })).toEqual({ moves: [1], round: 0 });
  });

  test("falls back to an empty sync for values that are not payloads", () => {
    expect(toSync(null)).toEqual(EMPTY_SYNC);
    expect(toSync(undefined)).toEqual(EMPTY_SYNC);
    expect(toSync("moves")).toEqual(EMPTY_SYNC);
    expect(toSync(7)).toEqual(EMPTY_SYNC);
    expect(toSync(0)).toEqual(EMPTY_SYNC);
    expect(toSync([3, 0, 6])).toEqual(EMPTY_SYNC);
    expect(toSync(true)).toEqual(EMPTY_SYNC);
  });

  test("falls back to an empty sync when moves is not an array", () => {
    expect(toSync({ moves: "3,0,6", round: 1 })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: { 0: 3 }, round: 1 })).toEqual(EMPTY_SYNC);
    expect(toSync({ round: 1 })).toEqual(EMPTY_SYNC);
  });

  test("falls back to an empty sync when round is not a number", () => {
    expect(toSync({ moves: [3], round: "1" })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [3], round: null })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [3] })).toEqual(EMPTY_SYNC);
  });

  test("refuses a round that is not a whole non-negative count", () => {
    expect(toSync({ moves: [1, 2], round: 0.5 })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [1, 2], round: -3 })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [1], round: Number.NaN })).toEqual(EMPTY_SYNC);
    expect(toSync({ moves: [1], round: Number.POSITIVE_INFINITY })).toEqual(EMPTY_SYNC);
  });

  test("drops columns outside the board and keeps the valid ones", () => {
    expect(toSync({ moves: [-1, 0, COLS, 6, COLS + 4], round: 1 })).toEqual({ moves: [0, 6], round: 1 });
  });

  test("drops columns that are not whole numbers", () => {
    expect(toSync({ moves: [2.5, 3, Number.NaN, Number.POSITIVE_INFINITY, 4], round: 1 })).toEqual({
      moves: [3, 4],
      round: 1,
    });
  });

  test("drops moves that are not numbers at all", () => {
    expect(toSync({ moves: ["3", null, undefined, {}, [2], true, 5], round: 1 })).toEqual({ moves: [5], round: 1 });
  });
});

describe("isAhead", () => {
  test("a higher round always wins, however short its move list", () => {
    expect(isAhead({ moves: [], round: 2 }, { moves: [1, 2, 3, 4], round: 1 })).toBe(true);
    expect(isAhead({ moves: [1, 2, 3, 4], round: 1 }, { moves: [], round: 2 })).toBe(false);
  });

  test("at an equal round the longer move list wins", () => {
    expect(isAhead({ moves: [1, 2], round: 3 }, { moves: [1], round: 3 })).toBe(true);
    expect(isAhead({ moves: [1], round: 3 }, { moves: [1, 2], round: 3 })).toBe(false);
  });

  test("an identical round and length is not ahead", () => {
    expect(isAhead({ moves: [1, 2], round: 3 }, { moves: [4, 5], round: 3 })).toBe(false);
    expect(isAhead(EMPTY_SYNC, EMPTY_SYNC)).toBe(false);
  });
});

describe("claimIdentity without usable storage", () => {
  test("keeps the same client id across calls", () => {
    const first = claimIdentity("no-storage-a", 1_000);
    const again = claimIdentity("no-storage-a", 2_000);
    expect(again.clientId).toBe(first.clientId);
  });

  test("keeps its place in line when it comes back within the grace period", () => {
    const first = claimIdentity("no-storage-b", 1_000);
    expect(claimIdentity("no-storage-b", 1_000 + SEAT_GRACE_MS - 1).since).toBe(first.since);
  });

  test("goes to the back of the line after the grace period", () => {
    claimIdentity("no-storage-c", 1_000);
    const later = 1_000 + SEAT_GRACE_MS;
    expect(claimIdentity("no-storage-c", later).since).toBe(later);
  });

  test("gives separate matches separate client ids", () => {
    expect(claimIdentity("no-storage-d").clientId).not.toBe(claimIdentity("no-storage-e").clientId);
  });
});

describe("connect when the realtime client fails to load", () => {
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

  test("reports the match as unavailable", async () => {
    const { calls, listeners } = listen();
    const stop = connect("load-fails", me, listeners, failedLoad);
    await settle();
    expect(calls).toEqual({ unavailable: 1, ready: 0 });
    stop();
  });

  test("stays quiet once it has been torn down", async () => {
    const { calls, listeners } = listen();
    connect("load-fails-late", me, listeners, failedLoad)();
    await settle();
    expect(calls).toEqual({ unavailable: 0, ready: 0 });
  });
});
