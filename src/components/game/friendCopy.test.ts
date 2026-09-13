import { describe, expect, test } from "bun:test";
import { EMPTY, FIRST, SECOND } from "./engine";
import { type Standing, friendCopy } from "./friendCopy";

const standing = (over: Partial<Standing> = {}): Standing => ({
  seat: "ink",
  watching: 0,
  moves: 0,
  over: false,
  result: EMPTY,
  myColor: FIRST,
  mine: true,
  joined: true,
  waiting: false,
  ...over,
});

describe("waiting for a friend", () => {
  test("asks you to send the link", () => {
    const copy = friendCopy(standing({ waiting: true }));

    expect(copy.title).toBe("Send this link. The board starts the moment they open it.");
    expect(copy.presence).toBe("Waiting for your friend to open the link.");
    expect(copy.kicker).toBe("Four in a row with a friend");
  });

  test("names your colour for both seats", () => {
    expect(friendCopy(standing({ waiting: true, myColor: FIRST })).lede).toBe(
      "You play ink and move first. Your friend plays red.",
    );
    expect(friendCopy(standing({ waiting: true, myColor: SECOND })).lede).toBe(
      "You play red and move first. Your friend plays ink.",
    );
  });
});

describe("iWon", () => {
  test("is true only when the game is over and the result is your colour", () => {
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: FIRST })).iWon).toBe(true);
    expect(friendCopy(standing({ over: true, result: SECOND, myColor: SECOND })).iWon).toBe(true);
  });

  test("is false when the other side won", () => {
    expect(friendCopy(standing({ over: true, result: SECOND, myColor: FIRST })).iWon).toBe(false);
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: SECOND })).iWon).toBe(false);
  });

  test("is false on a draw and while the game is still running", () => {
    expect(friendCopy(standing({ over: true, result: EMPTY, myColor: FIRST })).iWon).toBe(false);
    expect(friendCopy(standing({ over: false, result: FIRST, myColor: FIRST })).iWon).toBe(false);
  });

  test("is false when you have no seat", () => {
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: null })).iWon).toBe(false);
  });
});

describe("finished games", () => {
  test("a draw gets the draw title", () => {
    const copy = friendCopy(standing({ over: true, result: EMPTY, moves: 42 }));

    expect(copy.title).toBe("A draw. Rare, and fair.");
    expect(copy.presence).toBeNull();
  });

  test("the winner and the loser get their own title", () => {
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: FIRST })).title).toBe("You won.");
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: SECOND })).title).toBe("They won.");
  });

  test("the kicker carries the move count", () => {
    expect(friendCopy(standing({ over: true, result: FIRST, moves: 17 })).kicker).toBe(
      "Four in a row with a friend, 17 moves",
    );
  });

  test("the rematch line hands the first move to whoever lost", () => {
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: FIRST })).lede).toContain("so they move first");
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: SECOND })).lede).toContain("so you move first");
  });
});

describe("games in progress", () => {
  test("the kicker carries the move number and whose turn it is", () => {
    expect(friendCopy(standing({ moves: 6, mine: true })).kicker).toBe(
      "Four in a row with a friend, move 7, your move",
    );
    expect(friendCopy(standing({ moves: 6, mine: false })).kicker).toBe(
      "Four in a row with a friend, move 7, their move",
    );
  });

  test("the title follows the turn", () => {
    expect(friendCopy(standing({ mine: true })).title).toBe("Your move.");
    expect(friendCopy(standing({ mine: false })).title).toBe("Their move.");
  });

  test("presence differs when the friend is here and when they are away", () => {
    const here = friendCopy(standing({ joined: true }));
    const away = friendCopy(standing({ joined: false }));

    expect(here.presence).toBe("Both here.");
    expect(away.presence).toBe("Only you here right now.");
    expect(here.lede).toContain("Your friend is here.");
    expect(away.lede).toContain("Your friend stepped away");
  });

  test("the lede maps ink and red onto the two seats", () => {
    expect(friendCopy(standing({ myColor: FIRST })).lede).toContain("Ink is you, red is them.");
    expect(friendCopy(standing({ myColor: SECOND })).lede).toContain("Ink is them, red is you.");
  });
});

describe("spectators are told they are watching", () => {
  const watcher = (over: Partial<Standing> = {}) =>
    friendCopy(standing({ seat: "spectator", myColor: null, mine: false, ...over }));

  test("a spectator is never told it is their move", () => {
    expect(watcher().title).toBe("You are watching.");
    expect(watcher({ mine: true }).title).toBe("You are watching.");
  });

  test("a spectator never wins", () => {
    expect(watcher({ over: true, result: FIRST }).iWon).toBe(false);
    expect(watcher({ over: true, result: SECOND }).iWon).toBe(false);
  });

  test("a finished game names the winning colour rather than you or them", () => {
    expect(watcher({ over: true, result: FIRST }).title).toBe("Ink won.");
    expect(watcher({ over: true, result: SECOND }).title).toBe("Red won.");
    expect(watcher({ over: true, result: EMPTY }).title).toBe("A draw. Rare, and fair.");
  });

  test("the kicker says watching and never whose move it is", () => {
    const kicker = watcher({ moves: 4 }).kicker;
    expect(kicker).toContain("watching");
    expect(kicker).not.toContain("your move");
    expect(kicker).not.toContain("their move");
  });

  test("a spectator is told rematch is not theirs to start", () => {
    expect(watcher({ over: true, result: FIRST }).lede).toContain("Only the two players");
  });

  test("watcher count is pluralised", () => {
    expect(watcher({ watching: 1 }).presence).toBe("1 watching");
    expect(watcher({ watching: 3 }).presence).toBe("3 watching");
  });

  test("a seated player is told how many are watching", () => {
    expect(friendCopy(standing({ watching: 2, mine: false })).presence).toContain("2 watching");
  });
});
