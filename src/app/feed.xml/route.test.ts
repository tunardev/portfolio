import { promises as fs } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, test } from "bun:test";
import { SITE_URL } from "@/lib/site";
import { GET } from "./route";
import { cdata } from "@/lib/rss";

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

describe("the feed response", () => {
  test("it is served as rss xml", () => {
    expect(contentType).toBe("application/rss+xml; charset=utf-8");
  });

  test("it starts with the xml declaration", () => {
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  test("it holds exactly one channel", () => {
    expect(occurrences(body, "<channel>")).toBe(1);
    expect(occurrences(body, "</channel>")).toBe(1);
  });
});

describe("the feed items", () => {
  test("there is at least one post to publish", () => {
    expect(markdownFiles.length).toBeGreaterThan(0);
  });

  test("there is one item per markdown file in the blog directory", () => {
    expect(occurrences(body, "<item>")).toBe(markdownFiles.length);
    expect(occurrences(body, "</item>")).toBe(markdownFiles.length);
  });

  test("every item links to its own slug", () => {
    for (const file of markdownFiles) {
      expect(body).toContain(`<link>${SITE_URL}/blog/${file.replace(/\.md$/, "")}</link>`);
    }
  });

  test("every pubDate parses to a valid date", () => {
    const dates = [...body.matchAll(/<pubDate>(.*?)<\/pubDate>/g)].map((match) => match[1]);
    expect(dates).toHaveLength(markdownFiles.length);
    for (const date of dates) {
      expect(Number.isNaN(new Date(date).getTime())).toBe(false);
    }
  });

  test("the self link points at the feed url", () => {
    expect(body).toContain(`<atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />`);
  });
});

describe("the feed escapes markup", () => {
  test("no bare ampersand survives outside cdata", () => {
    expect(outsideCdata(body)).not.toContain(" & ");
  });

  test("every ampersand outside cdata opens an entity", () => {
    for (const match of outsideCdata(body).matchAll(/&(.{0,10})/g)) {
      expect(match[1]).toMatch(/^(amp|lt|gt|quot|apos|#\d+);/);
    }
  });

  test("cdata openers and closers are balanced across the whole feed", () => {
    expect(occurrences(body, "<![CDATA[")).toBe(occurrences(body, "]]>"));
  });
});

describe("cdata cannot be broken out of", () => {
  test("a terminator in the payload is split across two sections", () => {
    expect(cdata("a]]>b")).toBe("<![CDATA[a]]]]><![CDATA[>b]]>");
  });

  test("the split payload still decodes back to the original text", () => {
    const payload = "before]]><script>alert(1)</script>after";
    const sections = [...cdata(payload).matchAll(CDATA_SECTION)].map((match) => match[1]);
    expect(sections).toHaveLength(2);
    expect(sections.join("")).toBe(payload);
  });

  test("an escaped payload keeps its openers and closers balanced", () => {
    const escaped = cdata("]]>]]>]]>");
    expect(occurrences(escaped, "<![CDATA[")).toBe(4);
    expect(occurrences(escaped, "<![CDATA[")).toBe(occurrences(escaped, "]]>"));
  });

  test("a payload without a terminator is wrapped untouched", () => {
    expect(cdata("<p>plain</p>")).toBe("<![CDATA[<p>plain</p>]]>");
  });

  test("an empty payload is still a well-formed section", () => {
    expect(cdata("")).toBe("<![CDATA[]]>");
  });
});
