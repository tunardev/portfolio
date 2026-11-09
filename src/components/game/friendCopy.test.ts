import { describe, expect, test } from "bun:test";
import { EMPTY, FIRST, SECOND } from "./engine";
import { type Standing, friendCopy } from "./friendCopy";
import { INK_SEAT, SPECTATOR } from "./seats";

const standing = (over: Partial<Standing> = {}): Standing => ({
  seat: INK_SEAT,
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

describe("friendCopy while waiting", () => {
  test("returns invite title and presence", () => {
    const copy = friendCopy(standing({ waiting: true }));

    expect(copy.title).toBe("Send this link. The board starts the moment they open it.");
    expect(copy.presence).toBe("Waiting for your friend to open the link.");
    expect(copy.kicker).toBe("Four in a row with a friend");
  });

  test("describes color and move order", () => {
    expect(friendCopy(standing({ waiting: true, myColor: FIRST })).lede).toBe(
      "You play ink and move first. Your friend plays red.",
    );
    expect(friendCopy(standing({ waiting: true, myColor: SECOND })).lede).toBe(
      "You play red and move second. Your friend plays ink.",
    );
  });
});

describe("friendCopy iWon", () => {
  test("returns true when own color wins", () => {
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: FIRST })).iWon).toBe(true);
    expect(friendCopy(standing({ over: true, result: SECOND, myColor: SECOND })).iWon).toBe(true);
  });

  test("returns false when opponent wins", () => {
    expect(friendCopy(standing({ over: true, result: SECOND, myColor: FIRST })).iWon).toBe(false);
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: SECOND })).iWon).toBe(false);
  });

  test("returns false on draw or in progress", () => {
    expect(friendCopy(standing({ over: true, result: EMPTY, myColor: FIRST })).iWon).toBe(false);
    expect(friendCopy(standing({ over: false, result: FIRST, myColor: FIRST })).iWon).toBe(false);
  });

  test("returns false without assigned color", () => {
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: null })).iWon).toBe(false);
  });
});

describe("friendCopy after game over", () => {
  test("returns draw title", () => {
    const copy = friendCopy(standing({ over: true, result: EMPTY, moves: 42 }));

    expect(copy.title).toBe("A draw. Rare, and fair.");
    expect(copy.presence).toBeNull();
  });

  test("returns win and loss titles", () => {
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: FIRST })).title).toBe("You won.");
    expect(friendCopy(standing({ over: true, result: FIRST, myColor: SECOND })).title).toBe("They won.");
  });

  test("includes move count in kicker", () => {
    expect(friendCopy(standing({ over: true, result: FIRST, moves: 17 })).kicker).toBe(
      "Four in a row with a friend, 17 moves",
    );
  });

  test("assigns rematch first move to red player", () => {
    for (const result of [FIRST, SECOND, EMPTY] as const) {
      expect(friendCopy(standing({ over: true, result, myColor: FIRST })).lede).toContain("so they move first");
      expect(friendCopy(standing({ over: true, result, myColor: SECOND })).lede).toContain("so you move first");
    }
  });
});

describe("friendCopy during game", () => {
  test("includes move number and turn in kicker", () => {
    expect(friendCopy(standing({ moves: 6, mine: true })).kicker).toBe(
      "Four in a row with a friend, move 7, your move",
    );
    expect(friendCopy(standing({ moves: 6, mine: false })).kicker).toBe(
      "Four in a row with a friend, move 7, their move",
    );
  });

  test("returns title for current turn", () => {
    expect(friendCopy(standing({ mine: true })).title).toBe("Your move.");
    expect(friendCopy(standing({ mine: false })).title).toBe("Their move.");
  });

  test("reflects opponent presence", () => {
    const here = friendCopy(standing({ joined: true }));
    const away = friendCopy(standing({ joined: false }));

    expect(here.presence).toBe("Both here.");
    expect(away.presence).toBe("Only you here right now.");
    expect(here.lede).toContain("Your friend is here.");
    expect(away.lede).toContain("Your friend stepped away");
  });

  test("maps colors to players in lede", () => {
    expect(friendCopy(standing({ myColor: FIRST })).lede).toContain("Ink is you, red is them.");
    expect(friendCopy(standing({ myColor: SECOND })).lede).toContain("Ink is them, red is you.");
  });
});

describe("friendCopy for spectators", () => {
  const watcher = (over: Partial<Standing> = {}) =>
    friendCopy(standing({ seat: SPECTATOR, myColor: null, mine: false, ...over }));

  test("returns watching title regardless of turn", () => {
    expect(watcher().title).toBe("You are watching.");
    expect(watcher({ mine: true }).title).toBe("You are watching.");
  });

  test("reports no win for spectator", () => {
    expect(watcher({ over: true, result: FIRST }).iWon).toBe(false);
    expect(watcher({ over: true, result: SECOND }).iWon).toBe(false);
  });

  test("names winning color on game over", () => {
    expect(watcher({ over: true, result: FIRST }).title).toBe("Ink won.");
    expect(watcher({ over: true, result: SECOND }).title).toBe("Red won.");
    expect(watcher({ over: true, result: EMPTY }).title).toBe("A draw. Rare, and fair.");
  });

  test("omits turn from kicker", () => {
    const kicker = watcher({ moves: 4 }).kicker;
    expect(kicker).toContain("watching");
    expect(kicker).not.toContain("your move");
    expect(kicker).not.toContain("their move");
  });

  test("restricts rematch to players in lede", () => {
    expect(watcher({ over: true, result: FIRST }).lede).toContain("Only the two players");
  });

  test("formats spectator count", () => {
    expect(watcher({ watching: 1 }).presence).toBe("1 watching");
    expect(watcher({ watching: 3 }).presence).toBe("3 watching");
  });

  test("includes spectator count for seated player", () => {
    expect(friendCopy(standing({ watching: 2, mine: false })).presence).toContain("2 watching");
  });
});
