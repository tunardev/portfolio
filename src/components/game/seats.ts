import { FIRST, SECOND, type Player } from "./engine";

export const SEAT_GRACE_MS = 30_000;

export const INK_SEAT = "ink";
export const RED_SEAT = "red";
export const SPECTATOR = "spectator";

export type Seat = typeof INK_SEAT | typeof RED_SEAT | typeof SPECTATOR;

export type Occupant = { clientId: string; since: number };

export type Sighting = Occupant & { lastSeen: number };

export type SeatMap = { ink: string | null; red: string | null; spectators: string[] };

export const EMPTY_SEATS: SeatMap = { ink: null, red: null, spectators: [] };

// code-unit order, not localeCompare: every client must agree regardless of its locale
const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function seatOrder(occupants: Occupant[]): Occupant[] {
  return [...occupants].sort((a, b) => a.since - b.since || byId(a.clientId, b.clientId));
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
  if (seats.ink === clientId) return INK_SEAT;
  if (seats.red === clientId) return RED_SEAT;
  return SPECTATOR;
}

export function canAct(seat: Seat): boolean {
  return seat !== SPECTATOR;
}

export function colorOf(seat: Seat, inkMovesFirst: boolean): Player | null {
  if (seat === SPECTATOR) return null;
  return (seat === INK_SEAT) === inkMovesFirst ? FIRST : SECOND;
}

export function withSelf(occupants: Occupant[], me: Occupant): Occupant[] {
  return occupants.some((occupant) => occupant.clientId === me.clientId) ? occupants : [...occupants, me];
}

export function holdingSeats(sightings: Sighting[], present: ReadonlySet<string>, now: number): Occupant[] {
  const holding: Occupant[] = [];
  for (const { clientId, since, lastSeen } of sightings) {
    if (present.has(clientId) || now - lastSeen < SEAT_GRACE_MS) holding.push({ clientId, since });
  }
  return holding;
}

export function nextExpiry(sightings: Sighting[], present: ReadonlySet<string>, now: number): number | null {
  let soonest: number | null = null;
  for (const { clientId, lastSeen } of sightings) {
    if (present.has(clientId)) continue;
    const remaining = lastSeen + SEAT_GRACE_MS - now;
    if (remaining > 0 && (soonest === null || remaining < soonest)) soonest = remaining;
  }
  return soonest;
}
