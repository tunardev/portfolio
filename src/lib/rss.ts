import type { Post } from "@/lib/posts";
import { BLOG_TAGLINE, SITE_NAME, SITE_URL } from "@/lib/site";

const xmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const cdata = (value: string) => `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

const rfc822 = (date: string) => new Date(`${date}T00:00:00Z`).toUTCString();

function item(post: Post) {
  const url = xmlEscape(`${SITE_URL}/blog/${post.slug}`);
  return `
    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
      <description>${xmlEscape(post.excerpt)}</description>
      <content:encoded>${cdata(post.html)}</content:encoded>
    </item>`;
}

export function renderFeed(posts: Post[]) {
  // any post can carry the newest edit, not just the newest post
  const lastChange = posts
    .map((post) => post.updated ?? post.date)
    .sort()
    .at(-1);
  const lastBuildDate = lastChange ? rfc822(lastChange) : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xmlEscape(SITE_NAME)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${xmlEscape(BLOG_TAGLINE)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />${posts.map(item).join("")}
  </channel>
</rss>
`;
}
