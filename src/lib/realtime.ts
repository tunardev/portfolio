import type { SupabaseClient } from "@supabase/supabase-js";

const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const ID_LENGTH = 8;

let pending: Promise<SupabaseClient | null> | null = null;

function credentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export function isRealtimeConfigured() {
  return credentials() !== null;
}

export function realtime(): Promise<SupabaseClient | null> {
  pending ??= (async () => {
    const config = credentials();
    if (!config) return null;
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(config.url, config.key, { auth: { persistSession: false } });
  })();
  return pending;
}

export function shortId() {
  const bytes = new Uint8Array(ID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
}
