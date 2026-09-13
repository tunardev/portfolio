import { getPosts } from "@/lib/posts";
import { BLOG_TAGLINE, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const cdata = (s: string) => `<![CDATA[${s.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

const rfc822 = (date: string) => new Date(`${date}T00:00:00Z`).toUTCString();

export async function GET() {
  const posts = await getPosts();
  const items = posts
    .map(
      (post) => `
    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
      <description>${xmlEscape(post.excerpt)}</description>
      <content:encoded>${cdata(post.html)}</content:encoded>
    </item>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}/blog</link>
    <description>${BLOG_TAGLINE}</description>
    <language>en</language>
    <lastBuildDate>${posts[0] ? rfc822(posts[0].updated ?? posts[0].date) : new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
