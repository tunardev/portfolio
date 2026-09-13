import { EMPTY, FIRST, type Cell, type Player } from "./engine";

export type Standing = {
  moves: number;
  over: boolean;
  result: Cell;
  myColor: Player | null;
  mine: boolean;
  joined: boolean;
  waiting: boolean;
};

export function friendCopy(standing: Standing) {
  const { moves, over, result, myColor, mine, joined, waiting } = standing;
  const you = myColor === FIRST ? "ink" : "red";
  const them = myColor === FIRST ? "red" : "ink";
  const iWon = over && result !== EMPTY && result === myColor;

  const progress = over
    ? `, ${moves} moves`
    : waiting
      ? ""
      : `, move ${moves + 1}, ${mine ? "your move" : "their move"}`;
  const kicker = `Four in a row with a friend${progress}`;

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
    presence: joined ? "Both here." : "Only you here right now.",
    iWon,
  };
}
