import { describe, expect, test } from "bun:test";

import { readingTime } from "@/lib/reading-time";

const words = (count: number) => "checksum ".repeat(count).trim();

const fence = (lines: number) => ["```", ...Array.from({ length: lines }, () => "const value = 1;"), "```"].join("\n");

const images = (count: number) =>
  Array.from({ length: count }, (_, i) => `![diagram ${i}](/img-${i}.png)`).join("\n\n");

describe("readingTime", () => {
  test("an empty document has no words and still reports the one minute floor", () => {
    expect(readingTime("")).toEqual({ words: 0, minutes: 1 });
  });

  test("a two word document reports two words and one minute", () => {
    expect(readingTime("hello world")).toEqual({ words: 2, minutes: 1 });
  });

  test("two hundred and twenty words of prose is one minute", () => {
    expect(readingTime(words(220))).toEqual({ words: 220, minutes: 1 });
  });

  test("four hundred and forty words of prose is two minutes", () => {
    expect(readingTime(words(440))).toEqual({ words: 440, minutes: 2 });
  });

  test("eleven hundred words of prose is five minutes", () => {
    expect(readingTime(words(1100))).toEqual({ words: 1100, minutes: 5 });
  });

  test("forty fenced code lines add two minutes on top of the prose", () => {
    expect(readingTime(`${words(440)}\n\n${fence(40)}`)).toEqual({ words: 440, minutes: 4 });
  });

  test("five images add sixty seconds on top of the prose", () => {
    expect(readingTime(`${words(440)}\n\n${images(5)}`)).toEqual({ words: 440, minutes: 3 });
  });

  test("markdown syntax is stripped before words are counted", () => {
    const markdown = [
      "# Heading one",
      "",
      "- first bullet",
      "- second bullet",
      "",
      "> quoted line here",
      "",
      "**bold** and *italic* and `code`",
      "",
      "---",
      "",
      "[link text](https://example.com)",
    ].join("\n");

    expect(readingTime(markdown)).toEqual({ words: 16, minutes: 1 });
  });

  test("a link contributes its text but not its url", () => {
    expect(readingTime("[link text](https://example.com)").words).toBe(2);
  });

  test("fenced code content is not counted as words", () => {
    const markdown = ["hello world", "", "```ts", "const answer = compute(input);", "return answer;", "```"].join("\n");

    expect(readingTime(markdown).words).toBe(2);
  });

  test("an html tag contributes no words", () => {
    expect(readingTime("alpha <br /> beta").words).toBe(2);
  });

  test("three hundred and twenty nine words rounds down to one minute", () => {
    expect(readingTime(words(329))).toEqual({ words: 329, minutes: 1 });
  });

  test("three hundred and thirty one words rounds up to two minutes", () => {
    expect(readingTime(words(331))).toEqual({ words: 331, minutes: 2 });
  });
});
