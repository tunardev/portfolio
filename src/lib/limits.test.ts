import { beforeEach, describe, expect, test } from "bun:test";
import {
  DEDUPE_WINDOW_MS,
  MAX_TRACKED_KEYS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  allowRequest,
  claimSubmission,
  releaseSubmission,
  resetLimits,
  retryAfterSeconds,
} from "./limits";

const START = 1_000_000;

beforeEach(() => {
  resetLimits();
});

describe("allowRequest", () => {
  test("allows exactly the limit inside one window", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(allowRequest("a", START)).toBe(true);
    }
    expect(allowRequest("a", START)).toBe(false);
  });

  test("keeps refusing once the limit is passed", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    expect(allowRequest("a", START)).toBe(false);
    expect(allowRequest("a", START)).toBe(false);
  });

  test("still refuses just before the window closes", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    expect(allowRequest("a", START + RATE_LIMIT_WINDOW_MS - 1)).toBe(false);
  });

  test("allows again once the window has passed", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    expect(allowRequest("a", START + RATE_LIMIT_WINDOW_MS)).toBe(true);
  });

  test("counts each client separately", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    expect(allowRequest("a", START)).toBe(false);
    expect(allowRequest("b", START)).toBe(true);
  });

  test("an unseen client starts fresh", () => {
    expect(allowRequest("brand-new", START)).toBe(true);
  });
});

describe("retryAfterSeconds", () => {
  test("is at least one second for a client mid-window", () => {
    allowRequest("a", START);
    expect(retryAfterSeconds("a", START)).toBeGreaterThanOrEqual(1);
  });

  test("counts down as the window elapses", () => {
    allowRequest("a", START);
    const early = retryAfterSeconds("a", START);
    const later = retryAfterSeconds("a", START + RATE_LIMIT_WINDOW_MS / 2);
    expect(later).toBeLessThan(early);
  });

  test("never returns zero or a negative value", () => {
    allowRequest("a", START);
    expect(retryAfterSeconds("a", START + RATE_LIMIT_WINDOW_MS * 2)).toBeGreaterThanOrEqual(1);
    expect(retryAfterSeconds("never-seen", START)).toBeGreaterThanOrEqual(1);
  });
});

describe("claimSubmission", () => {
  test("the first claim succeeds and an immediate repeat does not", () => {
    expect(claimSubmission("game-1", START)).toBe(true);
    expect(claimSubmission("game-1", START)).toBe(false);
  });

  test("still refuses just before the dedupe window closes", () => {
    claimSubmission("game-1", START);
    expect(claimSubmission("game-1", START + DEDUPE_WINDOW_MS - 1)).toBe(false);
  });

  test("allows the same fingerprint once the window has passed", () => {
    claimSubmission("game-1", START);
    expect(claimSubmission("game-1", START + DEDUPE_WINDOW_MS)).toBe(true);
  });

  test("different fingerprints never collide", () => {
    expect(claimSubmission("game-1", START)).toBe(true);
    expect(claimSubmission("game-2", START)).toBe(true);
  });

  test("a refused claim does not extend the window", () => {
    claimSubmission("game-1", START);
    claimSubmission("game-1", START + DEDUPE_WINDOW_MS - 1);
    expect(claimSubmission("game-1", START + DEDUPE_WINDOW_MS)).toBe(true);
  });

  test("a released claim can be made again inside the window", () => {
    claimSubmission("game-1", START);
    releaseSubmission("game-1");
    expect(claimSubmission("game-1", START + 1)).toBe(true);
  });

  test("releasing one fingerprint leaves the others claimed", () => {
    claimSubmission("game-1", START);
    claimSubmission("game-2", START);
    releaseSubmission("game-1");
    expect(claimSubmission("game-2", START + 1)).toBe(false);
  });
});

describe("tracked keys are bounded", () => {
  test("a limited client stays limited while the tracked set has room", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    for (let i = 0; i < MAX_TRACKED_KEYS - 2; i++) allowRequest(`client-${i}`, START + 1);
    expect(allowRequest("a", START + 1)).toBe(false);
  });

  test("the oldest client is evicted once the tracked set is full", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    for (let i = 0; i < MAX_TRACKED_KEYS; i++) allowRequest(`client-${i}`, START + 1);
    expect(allowRequest("a", START + 1)).toBe(true);
  });

  test("a client whose window restarted is no longer the oldest", () => {
    allowRequest("a", START);
    allowRequest("b", START + 1);
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START + RATE_LIMIT_WINDOW_MS);
    for (let i = 0; i < MAX_TRACKED_KEYS - 2; i++) allowRequest(`client-${i}`, START + RATE_LIMIT_WINDOW_MS);
    expect(allowRequest("a", START + RATE_LIMIT_WINDOW_MS)).toBe(false);
  });

  test("the oldest submission is evicted once the tracked set is full", () => {
    claimSubmission("game-1", START);
    for (let i = 0; i < MAX_TRACKED_KEYS; i++) claimSubmission(`other-${i}`, START + 1);
    expect(claimSubmission("game-1", START + 1)).toBe(true);
  });
});

describe("resetLimits", () => {
  test("clears both the rate window and the dedupe record", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    claimSubmission("game-1", START);

    resetLimits();

    expect(allowRequest("a", START)).toBe(true);
    expect(claimSubmission("game-1", START)).toBe(true);
  });
});
