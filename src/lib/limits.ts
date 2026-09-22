export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 20;
export const DEDUPE_WINDOW_MS = 600_000;
export const MAX_TRACKED_KEYS = 10_000;

type Window = { count: number; startedAt: number };

const windows = new Map<string, Window>();
const submissions = new Map<string, number>();

// every key is deleted and re-set when its timer restarts, so map order is oldest first
// and pruning can stop at the first live entry
function prune<V>(entries: Map<string, V>, startOf: (value: V) => number, ttl: number, now: number) {
  for (const [key, value] of entries) {
    if (now - startOf(value) < ttl && entries.size < MAX_TRACKED_KEYS) return;
    entries.delete(key);
  }
}

function restart<V>(entries: Map<string, V>, key: string, value: V) {
  entries.delete(key);
  entries.set(key, value);
}

export function allowRequest(client: string, now = Date.now()): boolean {
  prune(windows, (window) => window.startedAt, RATE_LIMIT_WINDOW_MS, now);

  const current = windows.get(client);
  if (current && now - current.startedAt < RATE_LIMIT_WINDOW_MS) {
    current.count += 1;
    return current.count <= RATE_LIMIT_MAX;
  }

  restart(windows, client, { count: 1, startedAt: now });
  return true;
}

export function retryAfterSeconds(client: string, now = Date.now()): number {
  const current = windows.get(client);
  if (!current) return 1;
  return Math.max(1, Math.ceil((current.startedAt + RATE_LIMIT_WINDOW_MS - now) / 1000));
}

export function claimSubmission(fingerprint: string, now = Date.now()): boolean {
  prune(submissions, (seenAt) => seenAt, DEDUPE_WINDOW_MS, now);

  const seenAt = submissions.get(fingerprint);
  if (seenAt !== undefined && now - seenAt < DEDUPE_WINDOW_MS) return false;

  restart(submissions, fingerprint, now);
  return true;
}

export function releaseSubmission(fingerprint: string) {
  submissions.delete(fingerprint);
}

export function resetLimits() {
  windows.clear();
  submissions.clear();
}
