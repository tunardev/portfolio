import { getPosts } from "@/lib/posts";
import { renderFeed } from "@/lib/rss";

export const dynamic = "force-static";

export async function GET() {
  return new Response(renderFeed(await getPosts()), {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
