const PROSE_WORDS_PER_MINUTE = 220;
const CODE_LINES_PER_MINUTE = 20;
const SECONDS_PER_FIGURE = 12;
const SECONDS_PER_MINUTE = 60;

const FENCED_CODE = /(```|~~~)[\s\S]*?\1/g;
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
const HTML_TAG = /<[^>]+>/g;
const THEMATIC_BREAK = /^[ \t]{0,3}(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm;
const BLOCK_MARKER = /^[ \t]*(?:>[ \t]?)*[ \t]*(?:#{1,6}[ \t]+|[-*+][ \t]+|\d+[.)][ \t]+)?/gm;
const EMPHASIS = /[*_`~]/g;
const HAS_WORD_CHARACTER = /[\p{L}\p{N}]/u;

export type ReadingTime = { words: number; minutes: number };

export function readingTime(markdown: string): ReadingTime {
  let codeLines = 0;
  const withoutCode = markdown.replace(FENCED_CODE, (block) => {
    codeLines += Math.max(0, block.split("\n").length - 2);
    return " ";
  });

  let figures = 0;
  const withoutFigures = withoutCode.replace(IMAGE, () => {
    figures += 1;
    return " ";
  });

  const prose = withoutFigures
    .replace(LINK, "$1")
    .replace(HTML_TAG, " ")
    .replace(THEMATIC_BREAK, " ")
    .replace(BLOCK_MARKER, "")
    .replace(EMPHASIS, "")
    .replace(/\s+/g, " ")
    .trim();

  // stray punctuation such as a spaced dash or a table pipe is not a word
  const words = prose.split(" ").filter((token) => HAS_WORD_CHARACTER.test(token)).length;

  const seconds =
    (words / PROSE_WORDS_PER_MINUTE) * SECONDS_PER_MINUTE +
    (codeLines / CODE_LINES_PER_MINUTE) * SECONDS_PER_MINUTE +
    figures * SECONDS_PER_FIGURE;

  return { words, minutes: Math.max(1, Math.round(seconds / SECONDS_PER_MINUTE)) };
}
