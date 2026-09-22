import type { RealtimeChannel } from "@supabase/realtime-js";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { isRealtimeConfigured, realtime, shortId } from "@/lib/realtime";
import { COLS } from "./engine";
import {
  EMPTY_SEATS,
  SEAT_GRACE_MS,
  SPECTATOR,
  assignSeats,
  canAct,
  colorOf,
  holdingSeats,
  nextExpiry,
  seatOf,
  withSelf,
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
const memory = new Map<string, string>();
const leaving = new Map<string, Promise<unknown>>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// storage can throw when the browser blocks site data; keep the match playable in memory then
function readItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
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

// read storage, not rendered state, so two broadcasts landing before a re-render compare against the newest
const readSync = (id: string) => parseSync(readItem(stateKey(id)));

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

type Listeners = {
  onChannel: (channel: RealtimeChannel | null) => void;
  onPresence: (present: Map<string, number>) => void;
  onReady: () => void;
  onUnavailable: () => void;
};

export function connect(
  id: string,
  me: Occupant,
  { onChannel, onPresence, onReady, onUnavailable }: Listeners,
  load = realtime,
) {
  const topic = stateKey(id);
  let cancelled = false;
  let close: (() => void) | null = null;

  const open = async () => {
    const client = await load();
    // the client hands back a still-leaving channel for the same topic, and it cannot be joined twice
    await leaving.get(topic);
    if (cancelled || !client) return;

    const socket = client.channel(topic, { config: { presence: { key: me.clientId }, broadcast: { self: false } } });

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
      if (isAhead(theirs, readSync(id))) writeSync(id, theirs);
    });

    socket.on("broadcast", { event: "hello" }, () => {
      void socket.send({ type: "broadcast", event: "sync", payload: readSync(id) });
    });

    socket.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await socket.track({ clientId: me.clientId, since: me.since });
      await socket.send({ type: "broadcast", event: "hello", payload: {} });
      if (!cancelled) onReady();
    });

    onChannel(socket);
    close = () => {
      const removal = client.removeChannel(socket);
      leaving.set(topic, removal);
      void removal.finally(() => {
        if (leaving.get(topic) === removal) leaving.delete(topic);
      });
    };
  };

  void open().catch(() => {
    if (!cancelled) onUnavailable();
  });

  return () => {
    cancelled = true;
    onChannel(null);
    close?.();
  };
}

export function useMatch(id: string) {
  const [configured, setConfigured] = useState(isRealtimeConfigured);
  const [me, setMe] = useState<Occupant | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [present, setPresent] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);

  const channel = useRef<RealtimeChannel | null>(null);

  const syncRaw = useSyncExternalStore(
    subscribe,
    () => readItem(stateKey(id)),
    () => null,
  );
  const sync = useMemo(() => parseSync(syncRaw), [syncRaw]);

  // claimed after hydration: the server has no identity, so rendering one on the first pass would mismatch
  useEffect(() => setMe(claimIdentity(id)), [id]);

  useEffect(() => {
    if (!me) return;
    return connect(id, me, {
      onChannel: (socket) => {
        channel.current = socket;
      },
      onPresence: (incoming) => {
        const seenAt = Date.now();
        setNow(seenAt);
        setPresent(new Set(incoming.keys()));
        setSightings((previous) => {
          const byId = new Map(previous.map((seen) => [seen.clientId, seen]));
          for (const [clientId, since] of incoming) byId.set(clientId, { clientId, since, lastSeen: seenAt });
          return [...byId.values()];
        });
      },
      onReady: () => setReady(true),
      onUnavailable: () => setConfigured(false),
    });
  }, [id, me]);

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
    () => (me ? assignSeats(withSelf(holdingSeats(sightings, present, now), me)) : EMPTY_SEATS),
    [sightings, present, now, me],
  );

  const seat: Seat = me ? seatOf(seats, me.clientId) : SPECTATOR;
  const myColor = colorOf(seat, sync.round % 2 === 0);
  const seated = canAct(seat);

  const push = useCallback(
    (next: Sync) => {
      writeSync(id, next);
      void channel.current?.send({ type: "broadcast", event: "sync", payload: next });
    },
    [id],
  );

  const playMove = useCallback(
    (col: number) => {
      if (!seated) return;
      const current = readSync(id);
      push({ moves: [...current.moves, col], round: current.round });
    },
    [id, push, seated],
  );

  const rematch = useCallback(() => {
    if (seated) push({ moves: [], round: readSync(id).round + 1 });
  }, [id, push, seated]);

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
