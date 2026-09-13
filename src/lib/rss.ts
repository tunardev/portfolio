import type { Post } from "@/lib/posts";
import { BLOG_TAGLINE, SITE_NAME, SITE_URL } from "@/lib/site";

export const xmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const cdata = (value: string) => `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

export const rfc822 = (date: string) => new Date(`${date}T00:00:00Z`).toUTCString();

function item(post: Post) {
  return `
    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
      <description>${xmlEscape(post.excerpt)}</description>
      <content:encoded>${cdata(post.html)}</content:encoded>
    </item>`;
}

export function renderFeed(posts: Post[]) {
  const newest = posts[0];
  const lastBuildDate = newest ? rfc822(newest.updated ?? newest.date) : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}/blog</link>
    <description>${BLOG_TAGLINE}</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />${posts.map(item).join("")}
  </channel>
</rss>
`;
}
