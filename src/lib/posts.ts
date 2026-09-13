import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

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
const EXCERPT_LIMIT = 150;

function isoDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value ? String(value) : null;
}

function glyphOf(value: unknown): GlyphName | null {
  return typeof value === "string" && (GLYPHS as string[]).includes(value) ? (value as GlyphName) : null;
}

function excerptOf(markdown: string) {
  const firstParagraph =
    markdown
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find(Boolean) ?? "";
  const plain = firstParagraph.replace(/[*_`#>[\]]/g, "").replace(/\s+/g, " ");
  if (plain.length <= EXCERPT_LIMIT) return plain;

  const sentences = plain.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
  let excerpt = "";
  for (const sentence of sentences) {
    if (excerpt && (excerpt + sentence).trim().length > EXCERPT_LIMIT) break;
    excerpt += sentence;
  }
  excerpt = excerpt.trim();

  return excerpt || `${plain.slice(0, EXCERPT_LIMIT).replace(/\s+\S*$/, "")}…`;
}

async function readPost(file: string): Promise<Post> {
  const raw = await fs.readFile(path.join(POSTS_DIR, file), "utf8");
  const { data, content } = matter(raw);
  const date = isoDate(data.date);
  if (!date) throw new Error(`${file} has no date in its frontmatter`);

  const { words, minutes } = readingTime(content);

  return {
    slug: file.replace(/\.md$/, ""),
    title: String(data.title ?? file),
    date,
    minutes,
    excerpt: excerptOf(content),
    glyph: glyphOf(data.glyph),
    updated: isoDate(data.updated),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    words,
    html: await marked.parse(content, { gfm: true }),
  };
}

export async function getPosts(): Promise<Post[]> {
  const files = (await fs.readdir(POSTS_DIR)).filter((file) => file.endsWith(".md"));
  const posts = await Promise.all(files.map(readPost));
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
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

export function formatMonth(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatMonthLong(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
