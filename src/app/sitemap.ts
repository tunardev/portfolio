import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/posts";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  const touched = posts.map((post) => post.updated ?? post.date).sort();
  const newest = new Date(touched[touched.length - 1] ?? new Date().toISOString().slice(0, 10));

  return [
    { url: `${SITE_URL}/`, lastModified: newest, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: newest, changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updated ?? post.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
