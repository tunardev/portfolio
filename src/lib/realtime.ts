import type { RealtimeClient } from "@supabase/realtime-js";

const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const ID_LENGTH = 8;

let pending: Promise<RealtimeClient | null> | null = null;

function credentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export function isRealtimeConfigured() {
  return credentials() !== null;
}

async function connect(): Promise<RealtimeClient | null> {
  const config = credentials();
  if (!config) return null;
  // realtime-js alone, not supabase-js: friend games never sign in, query tables, or touch storage
  const { RealtimeClient } = await import("@supabase/realtime-js");
  const endpoint = new URL("realtime/v1", config.url.endsWith("/") ? config.url : `${config.url}/`);
  endpoint.protocol = endpoint.protocol.replace("http", "ws");
  return new RealtimeClient(endpoint.href, {
    params: { apikey: config.key },
    accessToken: () => Promise.resolve(config.key),
  });
}

export function realtime(): Promise<RealtimeClient | null> {
  // a failed chunk load must not be cached, or friend games stay broken until a full reload
  pending ??= connect().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

export function shortId() {
  const bytes = new Uint8Array(ID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
}
