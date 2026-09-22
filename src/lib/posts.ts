import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Marked } from "marked";

import { GLYPHS, type GlyphName } from "@/lib/glyphs";
import { readingTime } from "@/lib/reading-time";

export type Post = {
  slug: string;
  title: string;
  date: string;
  minutes: number;
  excerpt: string;
  glyph: GlyphName | null;
  updated: string | null;
  tags: string[];
  words: number;
  html: string;
};

const POSTS_DIR = path.join(process.cwd(), "content", "blog");
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EXCERPT_LIMIT = 150;
const UNSAFE_URL = /^\s*(?:javascript|vbscript|data):/i;

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

// the rendered html goes into the page and the rss feed unsanitized, so raw html in a post is shown as text
const postMarkdown = new Marked({
  gfm: true,
  renderer: {
    html: ({ text }) => escapeHtml(text),
  },
  walkTokens(token) {
    if ((token.type === "link" || token.type === "image") && UNSAFE_URL.test(token.href)) {
      throw new Error(`refusing to render a ${token.type} to ${token.href}`);
    }
  },
});

const DAY_MS = 86_400_000;
const utcMidnight = (iso: string) => new Date(`${iso}T00:00:00Z`);

function isoDate(value: unknown, field: string, file: string): string | null {
  if (value === undefined || value === null || value === "") return null;

  // yaml turns a timestamp with an offset into utc, which can land on a different calendar day
  if (value instanceof Date && value.getTime() % DAY_MS !== 0) {
    throw new Error(`${file}: ${field} must be a plain YYYY-MM-DD date`);
  }
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  const parsed = utcMidnight(iso);
  if (!ISO_DATE.test(iso) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    throw new Error(`${file}: ${field} must be a real YYYY-MM-DD date, got ${JSON.stringify(iso)}`);
  }
  return iso;
}

function glyphOf(value: unknown): GlyphName | null {
  return typeof value === "string" && (GLYPHS as string[]).includes(value) ? (value as GlyphName) : null;
}

const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const MARKDOWN_LINK = /\[([^\]]*)\]\([^)]*\)/g;

export function excerptOf(markdown: string) {
  const firstParagraph =
    markdown
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find(Boolean) ?? "";
  const plain = firstParagraph
    .replace(MARKDOWN_IMAGE, "")
    .replace(MARKDOWN_LINK, "$1")
    .replace(/[*_`#>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= EXCERPT_LIMIT) return plain;

  const sentences = plain.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
  let excerpt = "";
  for (const sentence of sentences) {
    if ((excerpt + sentence).trim().length > EXCERPT_LIMIT) break;
    excerpt += sentence;
  }
  excerpt = excerpt.trim();

  return excerpt || `${plain.slice(0, EXCERPT_LIMIT).replace(/\s+\S*$/, "")}…`;
}

export async function parsePost(file: string, raw: string): Promise<Post> {
  const slug = file.replace(/\.md$/, "");
  if (!SLUG_PATTERN.test(slug)) throw new Error(`${file}: file names must be lowercase letters, digits, and dashes`);

  const { data, content } = matter(raw);
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) throw new Error(`${file}: frontmatter needs a title`);
  const date = isoDate(data.date, "date", file);
  if (!date) throw new Error(`${file}: frontmatter needs a date`);

  const { words, minutes } = readingTime(content);

  return {
    slug,
    title,
    date,
    minutes,
    excerpt: excerptOf(content),
    glyph: glyphOf(data.glyph),
    updated: isoDate(data.updated, "updated", file),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    words,
    html: await postMarkdown.parse(content),
  };
}

async function readPost(file: string): Promise<Post> {
  return parsePost(file, await fs.readFile(path.join(POSTS_DIR, file), "utf8"));
}

export async function getPosts(): Promise<Post[]> {
  const files = (await fs.readdir(POSTS_DIR)).filter((file) => file.endsWith(".md"));
  const posts = await Promise.all(files.map(readPost));
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  try {
    return await readPost(`${slug}.md`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

const SHORT_MONTH = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const LONG_MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export function formatMonth(iso: string) {
  return SHORT_MONTH.format(utcMidnight(iso));
}

export function formatMonthLong(iso: string) {
  return LONG_MONTH.format(utcMidnight(iso));
}
