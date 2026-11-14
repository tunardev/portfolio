import { promises as fs } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, test } from "bun:test";
import type { Post } from "@/lib/posts";
import { cdata, renderFeed } from "@/lib/rss";
import { SITE_URL } from "@/lib/site";
import { GET } from "./route";

const CDATA_SECTION = /<!\[CDATA\[([\s\S]*?)\]\]>/g;

let body = "";
let contentType: string | null = null;
let markdownFiles: string[] = [];

function occurrences(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

function outsideCdata(xml: string) {
  return xml.replace(CDATA_SECTION, "");
}

beforeAll(async () => {
  const response = await GET();
  contentType = response.headers.get("content-type");
  body = await response.text();
  markdownFiles = (await fs.readdir(path.join(process.cwd(), "content", "blog"))).filter((file) =>
    file.endsWith(".md"),
  );
});

describe("GET /feed.xml response", () => {
  test("returns RSS content type", () => {
    expect(contentType).toBe("application/rss+xml; charset=utf-8");
  });

  test("starts with XML declaration", () => {
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  test("contains exactly one channel", () => {
    expect(occurrences(body, "<channel>")).toBe(1);
    expect(occurrences(body, "</channel>")).toBe(1);
  });
});

describe("GET /feed.xml items", () => {
  test("requires at least one post", () => {
    expect(markdownFiles.length).toBeGreaterThan(0);
  });

  test("emits one item per markdown file", () => {
    expect(occurrences(body, "<item>")).toBe(markdownFiles.length);
    expect(occurrences(body, "</item>")).toBe(markdownFiles.length);
  });

  test("links each item to its slug", () => {
    for (const file of markdownFiles) {
      expect(body).toContain(`<link>${SITE_URL}/blog/${file.replace(/\.md$/, "")}</link>`);
    }
  });

  test("emits valid pubDate values", () => {
    const dates = [...body.matchAll(/<pubDate>(.*?)<\/pubDate>/g)].map((match) => match[1]);
    expect(dates).toHaveLength(markdownFiles.length);
    for (const date of dates) {
      expect(Number.isNaN(new Date(date).getTime())).toBe(false);
    }
  });

  test("includes self link to feed url", () => {
    expect(body).toContain(`<atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />`);
  });
});

describe("GET /feed.xml escaping", () => {
  test("contains no bare ampersand outside CDATA", () => {
    expect(outsideCdata(body)).not.toContain(" & ");
  });

  test("escapes ampersands outside CDATA as entities", () => {
    for (const match of outsideCdata(body).matchAll(/&(.{0,10})/g)) {
      expect(match[1]).toMatch(/^(amp|lt|gt|quot|apos|#\d+);/);
    }
  });

  test("balances CDATA delimiters", () => {
    expect(occurrences(body, "<![CDATA[")).toBe(occurrences(body, "]]>"));
  });
});

describe("cdata", () => {
  test("splits terminator across two sections", () => {
    expect(cdata("a]]>b")).toBe("<![CDATA[a]]]]><![CDATA[>b]]>");
  });

  test("preserves payload across split sections", () => {
    const payload = "before]]><script>alert(1)</script>after";
    const sections = [...cdata(payload).matchAll(CDATA_SECTION)].map((match) => match[1]);
    expect(sections).toHaveLength(2);
    expect(sections.join("")).toBe(payload);
  });

  test("balances delimiters for repeated terminators", () => {
    const escaped = cdata("]]>]]>]]>");
    expect(occurrences(escaped, "<![CDATA[")).toBe(4);
    expect(occurrences(escaped, "<![CDATA[")).toBe(occurrences(escaped, "]]>"));
  });

  test("wraps payload without terminator unchanged", () => {
    expect(cdata("<p>plain</p>")).toBe("<![CDATA[<p>plain</p>]]>");
  });

  test("wraps empty payload", () => {
    expect(cdata("")).toBe("<![CDATA[]]>");
  });
});

function post(overrides: Partial<Post>): Post {
  return {
    slug: "a-post",
    title: "A post",
    date: "2025-01-01",
    minutes: 1,
    excerpt: "An excerpt.",
    glyph: null,
    updated: null,
    tags: [],
    words: 10,
    markdown: "Body",
    html: "<p>Body</p>",
    ...overrides,
  };
}

describe("renderFeed", () => {
  test("escapes markup in title and excerpt", () => {
    const xml = renderFeed([post({ title: "Tom & <Jerry>", excerpt: 'a "quoted" <b>word</b>' })]);
    expect(xml).toContain("<title>Tom &amp; &lt;Jerry&gt;</title>");
    expect(xml).toContain("<description>a &quot;quoted&quot; &lt;b&gt;word&lt;/b&gt;</description>");
  });

  test("sets lastBuildDate from latest update", () => {
    const xml = renderFeed([
      post({ slug: "newest", date: "2025-03-01" }),
      post({ slug: "older", date: "2025-01-01", updated: "2025-06-01" }),
    ]);
    expect(xml).toContain(`<lastBuildDate>${new Date("2025-06-01T00:00:00Z").toUTCString()}</lastBuildDate>`);
  });

  test("renders valid lastBuildDate for empty post list", () => {
    const xml = renderFeed([]);
    expect(occurrences(xml, "<item>")).toBe(0);
    const [, date] = xml.match(/<lastBuildDate>(.*?)<\/lastBuildDate>/) ?? [];
    expect(Number.isNaN(new Date(date ?? "").getTime())).toBe(false);
  });
});
