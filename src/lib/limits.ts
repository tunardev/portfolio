export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 20;
export const DEDUPE_WINDOW_MS = 600_000;
export const MAX_TRACKED_KEYS = 10_000;

type Window = { count: number; startedAt: number };

const windows = new Map<string, Window>();
const submissions = new Map<string, number>();

function sweep(now: number) {
  for (const [client, window] of windows) {
    if (now - window.startedAt >= RATE_LIMIT_WINDOW_MS) windows.delete(client);
  }
  for (const [fingerprint, seenAt] of submissions) {
    if (now - seenAt >= DEDUPE_WINDOW_MS) submissions.delete(fingerprint);
  }
}

export function allowRequest(client: string, now = Date.now()): boolean {
  if (windows.size >= MAX_TRACKED_KEYS) sweep(now);

  const current = windows.get(client);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    windows.set(client, { count: 1, startedAt: now });
    return true;
  }

  current.count += 1;
  return current.count <= RATE_LIMIT_MAX;
}

export function retryAfterSeconds(client: string, now = Date.now()): number {
  const current = windows.get(client);
  if (!current) return 1;
  return Math.max(1, Math.ceil((current.startedAt + RATE_LIMIT_WINDOW_MS - now) / 1000));
}

export function claimSubmission(fingerprint: string, now = Date.now()): boolean {
  if (submissions.size >= MAX_TRACKED_KEYS) sweep(now);

  const seenAt = submissions.get(fingerprint);
  if (seenAt !== undefined && now - seenAt < DEDUPE_WINDOW_MS) return false;

  submissions.set(fingerprint, now);
  return true;
}

export function resetLimits() {
  windows.clear();
  submissions.clear();
}
