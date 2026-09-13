import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MATCH_ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const MATCH_ID_LENGTH = 8;

let browserClient: SupabaseClient | null | undefined;

export function realtime(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  browserClient = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return browserClient;
}

export function matchId() {
  const bytes = new Uint8Array(MATCH_ID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => MATCH_ID_ALPHABET[byte % MATCH_ID_ALPHABET.length]).join("");
}
