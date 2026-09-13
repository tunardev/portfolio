import type { Metadata } from "next";
import Link from "next/link";
import { Chevron } from "@/components/Chevron";
import { MarkIcon } from "@/components/Mark";
import { PostRow } from "@/components/PostRow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { jsonLdScript } from "@/lib/jsonld";
import { getPosts } from "@/lib/posts";
import { AUTHOR, BLOG_DESCRIPTION, BLOG_ID, BLOG_TAGLINE, PERSON_ID, SITE_NAME, SITE_URL } from "@/lib/site";
import styles from "./blog.module.css";

const LISTING_DESCRIPTION =
  "How big tech actually works, one piece at a time: Raft, write-ahead logs, consistent hashing, Merkle trees, backpropagation.";

export const metadata: Metadata = {
  title: "Blog",
  description: LISTING_DESCRIPTION,
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/feed.xml" } },
  openGraph: {
    type: "website",
    url: "/blog",
    siteName: SITE_NAME,
    title: `Blog, ${SITE_NAME}`,
    description: BLOG_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `Blog, ${SITE_NAME}`,
    description: BLOG_DESCRIPTION,
  },
};

export default async function BlogIndex() {
  const posts = await getPosts();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": BLOG_ID,
      url: `${SITE_URL}/blog`,
      name: `${AUTHOR}'s blog`,
      description: BLOG_TAGLINE,
      inLanguage: "en",
      author: { "@id": PERSON_ID },
      publisher: { "@id": PERSON_ID },
      blogPost: posts.map((post) => ({
        "@type": "BlogPosting",
        headline: post.title,
        url: `${SITE_URL}/blog/${post.slug}`,
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      ],
    },
  ];

  return (
    <main className="column">
      <div className={`top ${styles.indexTop}`}>
        <Link href="/" className="name">
          <span className="mark-slot">
            <MarkIcon />
          </span>
          <span>{SITE_NAME}</span>
        </Link>
        <ThemeToggle />
      </div>

      <h1 className={`prose ${styles.indexTitle}`}>Blog. {BLOG_TAGLINE}</h1>

      <ul className={styles.list}>
        {posts.map((post) => (
          <PostRow key={post.slug} post={post} />
        ))}
      </ul>

      <Link href="/feed.xml" prefetch={false} className={`chevron-link ${styles.feed}`}>
        rss
        <Chevron />
      </Link>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
    </main>
  );
}
