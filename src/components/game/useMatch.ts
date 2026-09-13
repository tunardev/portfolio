import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { isRealtimeConfigured, realtime, shortId } from "@/lib/realtime";
import { COLS } from "./engine";
import {
  EMPTY_SEATS,
  SEAT_GRACE_MS,
  SPECTATOR,
  assignSeats,
  colorOf,
  holdingSeats,
  nextExpiry,
  seatOf,
  type Occupant,
  type Seat,
  type Sighting,
} from "./seats";

type Sync = { moves: number[]; round: number };

const EMPTY_SYNC: Sync = { moves: [], round: 0 };
const HEARTBEAT_MS = 5_000;
const EXPIRY_SLACK_MS = 50;

const stateKey = (id: string) => `match:${id}`;
const clientKey = (id: string) => `match:${id}:client`;
const sinceKey = (id: string) => `match:${id}:since`;
const seenKey = (id: string) => `match:${id}:seen`;

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

function writeItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function writeSync(id: string, next: Sync) {
  writeItem(stateKey(id), JSON.stringify(next));
  for (const listener of listeners) listener();
}

export function toSync(value: unknown): Sync {
  const candidate = value as Partial<Sync> | null;
  if (!candidate || !Array.isArray(candidate.moves)) return EMPTY_SYNC;
  const round = candidate.round;
  if (!Number.isInteger(round) || (round as number) < 0) return EMPTY_SYNC;
  return {
    moves: candidate.moves.filter((col) => Number.isInteger(col) && col >= 0 && col < COLS),
    round: round as number,
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

export function isAhead(theirs: Sync, ours: Sync) {
  if (theirs.round !== ours.round) return theirs.round > ours.round;
  return theirs.moves.length > ours.moves.length;
}

export function claimIdentity(id: string, now = Date.now()): Occupant {
  const clientId = readItem(clientKey(id)) ?? shortId();
  writeItem(clientKey(id), clientId);

  const lastSeen = Number(readItem(seenKey(id)) ?? 0);
  const stored = Number(readItem(sinceKey(id)) ?? 0);
  const kept = stored > 0 && now - lastSeen < SEAT_GRACE_MS;
  const since = kept ? stored : now;

  writeItem(sinceKey(id), String(since));
  writeItem(seenKey(id), String(now));
  return { clientId, since };
}

type ChannelRef = { current: RealtimeChannel | null };

async function openChannel(
  id: string,
  channel: ChannelRef,
  latest: { current: Sync },
  me: Occupant,
  onPresence: (present: Map<string, number>) => void,
  setReady: (ready: boolean) => void,
) {
  const client = await realtime();
  const socket =
    client?.channel(stateKey(id), { config: { presence: { key: me.clientId }, broadcast: { self: false } } }) ?? null;

  channel.current = socket;

  if (socket) {
    socket.on("presence", { event: "sync" }, () => {
      const present = new Map<string, number>();
      for (const [clientId, metas] of Object.entries(socket.presenceState())) {
        const meta = metas[0] as { since?: unknown } | undefined;
        const since = Number(meta?.since);
        present.set(clientId, Number.isFinite(since) ? since : Date.now());
      }
      onPresence(present);
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
      await socket.track({ clientId: me.clientId, since: me.since });
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

function connect(
  id: string,
  channel: ChannelRef,
  latest: { current: Sync },
  me: Occupant,
  onPresence: (present: Map<string, number>) => void,
  setReady: (ready: boolean) => void,
) {
  let cancelled = false;
  let close: (() => void) | null = null;

  void openChannel(id, channel, latest, me, onPresence, setReady).then((teardown) => {
    if (cancelled) {
      teardown();
      return;
    }
    close = teardown;
  });

  return () => {
    cancelled = true;
    close?.();
    close = null;
    channel.current = null;
  };
}

export function useMatch(id: string) {
  const [configured] = useState(isRealtimeConfigured);
  const [me] = useState<Occupant | null>(() => (typeof window === "undefined" ? null : claimIdentity(id)));
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [present, setPresent] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);

  const channel = useRef<RealtimeChannel | null>(null);
  const latest = useRef<Sync>(EMPTY_SYNC);

  const syncRaw = useSyncExternalStore(
    subscribe,
    () => readItem(stateKey(id)),
    () => null,
  );
  const sync = useMemo(() => parseSync(syncRaw), [syncRaw]);
  useEffect(() => {
    latest.current = sync;
  }, [sync]);

  const onPresence = useCallback((incoming: Map<string, number>) => {
    const seenAt = Date.now();
    setNow(seenAt);
    setPresent(new Set(incoming.keys()));
    setSightings((previous) => {
      const byId = new Map(previous.map((seen) => [seen.clientId, seen]));
      for (const [clientId, since] of incoming) byId.set(clientId, { clientId, since, lastSeen: seenAt });
      return [...byId.values()];
    });
  }, []);

  useEffect(() => (me ? connect(id, channel, latest, me, onPresence, setReady) : undefined), [id, me, onPresence]);

  useEffect(() => {
    const beat = window.setInterval(() => writeItem(seenKey(id), String(Date.now())), HEARTBEAT_MS);
    return () => window.clearInterval(beat);
  }, [id]);

  useEffect(() => {
    const wait = nextExpiry(sightings, present, now);
    if (wait === null) return;
    const timer = window.setTimeout(() => setNow(Date.now()), wait + EXPIRY_SLACK_MS);
    return () => window.clearTimeout(timer);
  }, [sightings, present, now]);

  const seats = useMemo(
    () => (sightings.length ? assignSeats(holdingSeats(sightings, present, now)) : EMPTY_SEATS),
    [sightings, present, now],
  );

  const inkMovesFirst = sync.round % 2 === 0;
  const seat: Seat = me ? seatOf(seats, me.clientId) : SPECTATOR;
  const myColor = colorOf(seat, inkMovesFirst);

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

  return {
    seat,
    myColor,
    bothSeated: seats.ink !== null && seats.red !== null,
    watching: seats.spectators.length,
    moves: sync.moves,
    round: sync.round,
    ready,
    configured,
    playMove,
    rematch,
  };
}
