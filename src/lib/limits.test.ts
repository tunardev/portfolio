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
  test("allows requests up to limit per window", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(allowRequest("a", START)).toBe(true);
    }
    expect(allowRequest("a", START)).toBe(false);
  });

  test("rejects requests after limit exceeded", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    expect(allowRequest("a", START)).toBe(false);
    expect(allowRequest("a", START)).toBe(false);
  });

  test("rejects until window ends", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    expect(allowRequest("a", START + RATE_LIMIT_WINDOW_MS - 1)).toBe(false);
  });

  test("allows requests after window resets", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    expect(allowRequest("a", START + RATE_LIMIT_WINDOW_MS)).toBe(true);
  });

  test("tracks clients independently", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    expect(allowRequest("a", START)).toBe(false);
    expect(allowRequest("b", START)).toBe(true);
  });

  test("allows new client", () => {
    expect(allowRequest("brand-new", START)).toBe(true);
  });
});

describe("retryAfterSeconds", () => {
  test("returns at least 1 mid-window", () => {
    allowRequest("a", START);
    expect(retryAfterSeconds("a", START)).toBeGreaterThanOrEqual(1);
  });

  test("decreases as window elapses", () => {
    allowRequest("a", START);
    const early = retryAfterSeconds("a", START);
    const later = retryAfterSeconds("a", START + RATE_LIMIT_WINDOW_MS / 2);
    expect(later).toBeLessThan(early);
  });

  test("never returns less than 1", () => {
    allowRequest("a", START);
    expect(retryAfterSeconds("a", START + RATE_LIMIT_WINDOW_MS * 2)).toBeGreaterThanOrEqual(1);
    expect(retryAfterSeconds("never-seen", START)).toBeGreaterThanOrEqual(1);
  });
});

describe("claimSubmission", () => {
  test("rejects immediate duplicate", () => {
    expect(claimSubmission("game-1", START)).toBe(true);
    expect(claimSubmission("game-1", START)).toBe(false);
  });

  test("rejects duplicate until window ends", () => {
    claimSubmission("game-1", START);
    expect(claimSubmission("game-1", START + DEDUPE_WINDOW_MS - 1)).toBe(false);
  });

  test("accepts duplicate after window", () => {
    claimSubmission("game-1", START);
    expect(claimSubmission("game-1", START + DEDUPE_WINDOW_MS)).toBe(true);
  });

  test("accepts distinct fingerprints", () => {
    expect(claimSubmission("game-1", START)).toBe(true);
    expect(claimSubmission("game-2", START)).toBe(true);
  });

  test("does not extend window on rejection", () => {
    claimSubmission("game-1", START);
    claimSubmission("game-1", START + DEDUPE_WINDOW_MS - 1);
    expect(claimSubmission("game-1", START + DEDUPE_WINDOW_MS)).toBe(true);
  });

  test("accepts released fingerprint within window", () => {
    claimSubmission("game-1", START);
    releaseSubmission("game-1");
    expect(claimSubmission("game-1", START + 1)).toBe(true);
  });

  test("releases only specified fingerprint", () => {
    claimSubmission("game-1", START);
    claimSubmission("game-2", START);
    releaseSubmission("game-1");
    expect(claimSubmission("game-2", START + 1)).toBe(false);
  });
});

describe("tracked key eviction", () => {
  test("retains limited client below capacity", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    for (let i = 0; i < MAX_TRACKED_KEYS - 2; i++) allowRequest(`client-${i}`, START + 1);
    expect(allowRequest("a", START + 1)).toBe(false);
  });

  test("evicts oldest client at capacity", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    for (let i = 0; i < MAX_TRACKED_KEYS; i++) allowRequest(`client-${i}`, START + 1);
    expect(allowRequest("a", START + 1)).toBe(true);
  });

  test("treats restarted window as newest", () => {
    allowRequest("a", START);
    allowRequest("b", START + 1);
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START + RATE_LIMIT_WINDOW_MS);
    for (let i = 0; i < MAX_TRACKED_KEYS - 2; i++) allowRequest(`client-${i}`, START + RATE_LIMIT_WINDOW_MS);
    expect(allowRequest("a", START + RATE_LIMIT_WINDOW_MS)).toBe(false);
  });

  test("evicts oldest submission at capacity", () => {
    claimSubmission("game-1", START);
    for (let i = 0; i < MAX_TRACKED_KEYS; i++) claimSubmission(`other-${i}`, START + 1);
    expect(claimSubmission("game-1", START + 1)).toBe(true);
  });
});

describe("resetLimits", () => {
  test("clears rate limits and submissions", () => {
    for (let i = 0; i <= RATE_LIMIT_MAX; i++) allowRequest("a", START);
    claimSubmission("game-1", START);

    resetLimits();

    expect(allowRequest("a", START)).toBe(true);
    expect(claimSubmission("game-1", START)).toBe(true);
  });
});
