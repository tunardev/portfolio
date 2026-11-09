import { describe, expect, test } from "bun:test";

import { readingTime } from "@/lib/reading-time";

const words = (count: number) => "checksum ".repeat(count).trim();

const fence = (lines: number) => ["```", ...Array.from({ length: lines }, () => "const value = 1;"), "```"].join("\n");

const images = (count: number) =>
  Array.from({ length: count }, (_, i) => `![diagram ${i}](/img-${i}.png)`).join("\n\n");

describe("readingTime", () => {
  test("returns 1 minute minimum for empty input", () => {
    expect(readingTime("")).toEqual({ words: 0, minutes: 1 });
  });

  test("returns 1 minute for two words", () => {
    expect(readingTime("hello world")).toEqual({ words: 2, minutes: 1 });
  });

  test("returns 1 minute for 220 words", () => {
    expect(readingTime(words(220))).toEqual({ words: 220, minutes: 1 });
  });

  test("returns 2 minutes for 440 words", () => {
    expect(readingTime(words(440))).toEqual({ words: 440, minutes: 2 });
  });

  test("returns 5 minutes for 1100 words", () => {
    expect(readingTime(words(1100))).toEqual({ words: 1100, minutes: 5 });
  });

  test("adds 2 minutes for 40 code lines", () => {
    expect(readingTime(`${words(440)}\n\n${fence(40)}`)).toEqual({ words: 440, minutes: 4 });
  });

  test("adds 1 minute for 5 images", () => {
    expect(readingTime(`${words(440)}\n\n${images(5)}`)).toEqual({ words: 440, minutes: 3 });
  });

  test("excludes markdown syntax from word count", () => {
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

  test("counts link text but not url", () => {
    expect(readingTime("[link text](https://example.com)").words).toBe(2);
  });

  test("excludes backtick fenced code from word count", () => {
    const markdown = ["hello world", "", "```ts", "const answer = compute(input);", "return answer;", "```"].join("\n");

    expect(readingTime(markdown).words).toBe(2);
  });

  test("excludes HTML tags from word count", () => {
    expect(readingTime("alpha <br /> beta").words).toBe(2);
  });

  test("excludes tilde fenced code from word count", () => {
    const markdown = ["hello world", "", "~~~", "const answer = compute(input);", "return answer;", "~~~"].join("\n");

    expect(readingTime(markdown).words).toBe(2);
  });

  test("excludes nested list and quote markers", () => {
    const markdown = ["- outer", "    - inner", "        1) deepest", "", "> > nested quote"].join("\n");

    expect(readingTime(markdown).words).toBe(5);
  });

  test("excludes dashes and table pipes", () => {
    const markdown = ["one — two", "", "| a | b |", "| --- | --- |", "| c | d |"].join("\n");

    expect(readingTime(markdown).words).toBe(6);
  });

  test("rounds 329 words down to 1 minute", () => {
    expect(readingTime(words(329))).toEqual({ words: 329, minutes: 1 });
  });

  test("rounds 331 words up to 2 minutes", () => {
    expect(readingTime(words(331))).toEqual({ words: 331, minutes: 2 });
  });
});
