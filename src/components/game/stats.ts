import type { Outcome, Stats } from "@/lib/games-store";

export type { Outcome, Stats };

const ENDPOINT = "/api/games";

export async function fetchStats(): Promise<Stats | null> {
  try {
    const response = await fetch(ENDPOINT);
    return response.ok ? ((await response.json()) as Stats) : null;
  } catch {
    return null;
  }
}

export async function recordGame(moves: number[], result: Outcome, modelVersion: string): Promise<Stats | null> {
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moves, result, modelVersion }),
    });
    return response.ok ? ((await response.json()) as Stats) : null;
  } catch {
    return null;
  }
}
