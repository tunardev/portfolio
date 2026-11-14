import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Marked, Renderer } from "marked";

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
  markdown: string;
  html: string;
};

export type PostElementClassNames = {
  link?: string;
  code?: string;
  heading2?: string;
  list?: string;
};

const POSTS_DIR = path.join(process.cwd(), "content", "blog");
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EXCERPT_LIMIT = 150;
const UNSAFE_URL = /^\s*(?:javascript|vbscript|data):/i;

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

function addClassName(html: string, tagName: string, className: string | undefined) {
  const openingTag = `<${tagName}`;
  if (!className || !html.startsWith(openingTag)) return html;
  return `${openingTag} class="${escapeHtml(className)}"${html.slice(openingTag.length)}`;
}

function createPostMarked(classNames: PostElementClassNames) {
  return new Marked({
    gfm: true,
    renderer: {
      html: ({ text }) => escapeHtml(text),
      link(token) {
        return addClassName(Renderer.prototype.link.call(this, token), "a", classNames.link);
      },
      codespan(token) {
        return addClassName(Renderer.prototype.codespan.call(this, token), "code", classNames.code);
      },
      heading(token) {
        const html = Renderer.prototype.heading.call(this, token);
        return token.depth === 2 ? addClassName(html, "h2", classNames.heading2) : html;
      },
      list(token) {
        return addClassName(Renderer.prototype.list.call(this, token), token.ordered ? "ol" : "ul", classNames.list);
      },
    },
    walkTokens(token) {
      if ((token.type === "link" || token.type === "image") && UNSAFE_URL.test(token.href)) {
        throw new Error(`refusing to render a ${token.type} to ${token.href}`);
      }
    },
  });
}

export function renderMarkdown(markdown: string, classNames: PostElementClassNames = {}): string {
  return createPostMarked(classNames).parse(markdown, { async: false });
}

const DAY_MS = 86_400_000;
const utcMidnight = (iso: string) => new Date(`${iso}T00:00:00Z`);

function isoDate(value: unknown, field: string, file: string): string | null {
  if (value === undefined || value === null || value === "") return null;

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
    markdown: content,
    html: renderMarkdown(content),
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
