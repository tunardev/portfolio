import { EMPTY, FIRST, type Cell, type Player } from "./engine";
import type { Seat } from "./seats";

export type Standing = {
  seat: Seat;
  moves: number;
  over: boolean;
  result: Cell;
  myColor: Player | null;
  mine: boolean;
  joined: boolean;
  waiting: boolean;
  watching: number;
};

const watchers = (count: number) => (count === 1 ? "1 watching" : `${count} watching`);

function progress(standing: Standing) {
  const { moves, over, waiting, mine, seat } = standing;
  if (over) return `, ${moves} moves`;
  if (waiting) return "";
  if (seat === "spectator") return `, move ${moves + 1}`;
  return `, move ${moves + 1}, ${mine ? "your move" : "their move"}`;
}

function spectatorCopy(standing: Standing) {
  const { moves, over, result, joined, watching } = standing;
  const kicker = `Four in a row, watching${progress(standing)}`;
  const presence = joined ? watchers(watching) : "Waiting for both players.";

  if (over) {
    return {
      kicker,
      title: result === EMPTY ? "A draw. Rare, and fair." : result === FIRST ? "Ink won." : "Red won.",
      lede: "You were watching this one. Only the two players can start a rematch.",
      presence: null,
      iWon: false,
    };
  }

  return {
    kicker,
    title: joined ? "You are watching." : "Waiting for both players.",
    lede: joined
      ? `Both seats are taken, so you are here as a spectator. Ink moves first${moves > 0 ? "" : " once the game starts"}.`
      : "The board opens when two people are here. You will watch unless a seat frees up.",
    presence,
    iWon: false,
  };
}

export function friendCopy(standing: Standing) {
  if (standing.seat === "spectator") return spectatorCopy(standing);

  const { over, result, myColor, mine, joined, waiting, watching } = standing;
  const you = myColor === FIRST ? "ink" : "red";
  const them = myColor === FIRST ? "red" : "ink";
  const iWon = over && result !== EMPTY && result === myColor;
  const kicker = `Four in a row with a friend${progress(standing)}`;
  const seen = watching > 0 ? ` ${watchers(watching)}.` : "";

  if (waiting) {
    return {
      kicker,
      title: "Send this link. The board starts the moment they open it.",
      lede: `You play ${you} and move first. Your friend plays ${them}.`,
      presence: "Waiting for your friend to open the link.",
      iWon,
    };
  }

  if (over) {
    const movesFirst = iWon || result === EMPTY ? "they" : "you";
    return {
      kicker,
      title: result === EMPTY ? "A draw. Rare, and fair." : iWon ? "You won." : "They won.",
      lede: `Rematch swaps the colors, so ${movesFirst} move first this time. Friend games stay between the two of you; they do not train the model.`,
      presence: null,
      iWon,
    };
  }

  return {
    kicker,
    title: mine ? "Your move." : "Their move.",
    lede: `${joined ? "Your friend is here." : "Your friend stepped away; the board keeps their moves."} Ink is ${
      myColor === FIRST ? "you" : "them"
    }, red is ${myColor === FIRST ? "them" : "you"}. Tap a column, the ring is the last move.`,
    presence: `${joined ? "Both here." : "Only you here right now."}${seen}`,
    iWon,
  };
}
