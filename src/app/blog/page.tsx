import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import Link from "next/link";
import { Chevron } from "@/components/Chevron";
import { HomeLink } from "@/components/HomeLink";
import { PostList } from "@/components/PostList";
import { PostRow } from "@/components/PostRow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { jsonLdScript } from "@/lib/jsonld";
import { getPosts } from "@/lib/posts";
import { AUTHOR, BLOG_DESCRIPTION, BLOG_ID, BLOG_TAGLINE, PERSON_ID, SITE_NAME, SITE_URL } from "@/lib/site";
import { chevronLinkMarker } from "@/styles/markers.stylex";
import { shared } from "@/styles/shared";
import { fontSizes, sizes, spacing } from "@/styles/tokens.stylex";

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
    <main {...stylex.props(shared.column)}>
      <div {...stylex.props(shared.header, styles.header)}>
        <HomeLink />
        <ThemeToggle />
      </div>

      <h1 {...stylex.props(shared.prose, styles.title)}>Blog. {BLOG_TAGLINE}</h1>

      <PostList>
        {posts.map((post) => (
          <PostRow key={post.slug} post={post} />
        ))}
      </PostList>

      <Link href="/feed.xml" prefetch={false} {...stylex.props(shared.chevronLink, chevronLinkMarker, styles.feedLink)}>
        rss
        <Chevron />
      </Link>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
    </main>
  );
}

const styles = stylex.create({
  header: {
    paddingBlockEnd: sizes.gutter,
  },
  title: {
    margin: 0,
    paddingBlockEnd: spacing.sm,
    fontSize: fontSizes.body,
    fontWeight: 400,
  },
  feedLink: {
    marginBlockStart: spacing.sm,
  },
});
