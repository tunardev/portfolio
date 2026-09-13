import { FIRST, SECOND, type Player } from "./engine";

export const SEAT_GRACE_MS = 30_000;

export type Seat = "ink" | "red" | "spectator";

export type Occupant = { clientId: string; since: number };

export type Sighting = Occupant & { lastSeen: number };

export type SeatMap = { ink: string | null; red: string | null; spectators: string[] };

export const EMPTY_SEATS: SeatMap = { ink: null, red: null, spectators: [] };

export function seatOrder(occupants: Occupant[]): Occupant[] {
  return [...occupants].sort(
    (a, b) => a.since - b.since || (a.clientId < b.clientId ? -1 : a.clientId > b.clientId ? 1 : 0),
  );
}

export function assignSeats(occupants: Occupant[]): SeatMap {
  const ordered = seatOrder(occupants);
  return {
    ink: ordered[0]?.clientId ?? null,
    red: ordered[1]?.clientId ?? null,
    spectators: ordered.slice(2).map((occupant) => occupant.clientId),
  };
}

export function seatOf(seats: SeatMap, clientId: string): Seat {
  if (seats.ink === clientId) return "ink";
  if (seats.red === clientId) return "red";
  return "spectator";
}

export function colorOf(seat: Seat, hostMovesFirst: boolean): Player | null {
  if (seat === "spectator") return null;
  return (seat === "ink") === hostMovesFirst ? FIRST : SECOND;
}

export function holdingSeats(sightings: Sighting[], present: ReadonlySet<string>, now: number): Occupant[] {
  return sightings
    .filter((seen) => present.has(seen.clientId) || now - seen.lastSeen < SEAT_GRACE_MS)
    .map(({ clientId, since }) => ({ clientId, since }));
}

export function nextExpiry(sightings: Sighting[], present: ReadonlySet<string>, now: number): number | null {
  const waiting = sightings
    .filter((seen) => !present.has(seen.clientId))
    .map((seen) => seen.lastSeen + SEAT_GRACE_MS - now)
    .filter((remaining) => remaining > 0);
  return waiting.length ? Math.min(...waiting) : null;
}
