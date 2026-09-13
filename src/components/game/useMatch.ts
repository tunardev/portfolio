import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { COLS, FIRST, SECOND, type Player } from "./engine";
import { realtime } from "@/lib/realtime";

export type Role = "host" | "guest";

type Sync = { moves: number[]; round: number };

const EMPTY_SYNC: Sync = { moves: [], round: 0 };

const stateKey = (id: string) => `match:${id}`;
export const seatKey = (id: string) => `match:${id}:seat`;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSync(id: string, next: Sync) {
  try {
    localStorage.setItem(stateKey(id), JSON.stringify(next));
  } catch {}
  for (const listener of listeners) listener();
}

function toSync(value: unknown): Sync {
  const candidate = value as Partial<Sync> | null;
  if (!candidate || !Array.isArray(candidate.moves) || typeof candidate.round !== "number") return EMPTY_SYNC;
  return {
    moves: candidate.moves.filter((col) => Number.isInteger(col) && col >= 0 && col < COLS),
    round: candidate.round,
  };
}

function parseSync(raw: string | null): Sync {
  if (!raw) return EMPTY_SYNC;
  try {
    return toSync(JSON.parse(raw));
  } catch {
    return EMPTY_SYNC;
  }
}

function isAhead(theirs: Sync, ours: Sync) {
  if (theirs.round !== ours.round) return theirs.round > ours.round;
  return theirs.moves.length > ours.moves.length;
}

type ChannelRef = { current: RealtimeChannel | null };

function connect(
  id: string,
  channel: ChannelRef,
  latest: { current: Sync },
  setOthers: (count: number) => void,
  setReady: (ready: boolean) => void,
) {
  const client = realtime();
  const seat: Role = readItem(seatKey(id)) === "host" ? "host" : "guest";
  const presenceKey = `${seat}-${Math.random().toString(36).slice(2, 8)}`;
  const socket =
    client?.channel(stateKey(id), { config: { presence: { key: presenceKey }, broadcast: { self: false } } }) ?? null;

  channel.current = socket;

  if (socket) {
    socket.on("presence", { event: "sync" }, () => {
      setOthers(Math.max(0, Object.keys(socket.presenceState()).length - 1));
    });

    socket.on("broadcast", { event: "sync" }, ({ payload }) => {
      const theirs = toSync(payload);
      if (isAhead(theirs, latest.current)) writeSync(id, theirs);
    });

    socket.on("broadcast", { event: "hello" }, () => {
      void socket.send({ type: "broadcast", event: "sync", payload: latest.current });
    });

    socket.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await socket.track({ seat, at: Date.now() });
      await socket.send({ type: "broadcast", event: "hello", payload: {} });
      setReady(true);
    });
  }

  return () => {
    if (socket) {
      void socket.unsubscribe();
      void client?.removeChannel(socket);
    }
    channel.current = null;
  };
}

export function useMatch(id: string) {
  const [configured] = useState(() => realtime() !== null);
  const seatRaw = useSyncExternalStore(
    subscribe,
    () => readItem(seatKey(id)),
    () => null,
  );
  const syncRaw = useSyncExternalStore(
    subscribe,
    () => readItem(stateKey(id)),
    () => null,
  );
  const [others, setOthers] = useState(0);
  const [ready, setReady] = useState(false);
  const channel = useRef<RealtimeChannel | null>(null);
  const latest = useRef<Sync>(EMPTY_SYNC);

  const sync = useMemo(() => parseSync(syncRaw), [syncRaw]);
  useEffect(() => {
    latest.current = sync;
  }, [sync]);

  const role: Role | null =
    seatRaw === null && typeof window === "undefined" ? null : seatRaw === "host" ? "host" : "guest";

  useEffect(() => connect(id, channel, latest, setOthers, setReady), [id]);

  const push = useCallback(
    (next: Sync) => {
      writeSync(id, next);
      void channel.current?.send({ type: "broadcast", event: "sync", payload: next });
    },
    [id],
  );

  const playMove = useCallback(
    (col: number) => push({ moves: [...latest.current.moves, col], round: latest.current.round }),
    [push],
  );

  const rematch = useCallback(() => push({ moves: [], round: latest.current.round + 1 }), [push]);

  const hostMovesFirst = sync.round % 2 === 0;
  const myColor: Player | null = role === null ? null : (role === "host") === hostMovesFirst ? FIRST : SECOND;

  return { role, myColor, others, moves: sync.moves, round: sync.round, ready, configured, playMove, rematch };
}
