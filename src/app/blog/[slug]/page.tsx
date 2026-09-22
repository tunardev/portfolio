import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chevron } from "@/components/Chevron";
import { DitherHeader } from "@/components/DitherHeader";
import { Glyph } from "@/components/Glyph";
import { PostRow } from "@/components/PostRow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { jsonLdScript } from "@/lib/jsonld";
import { formatMonthLong, getPost, getPosts } from "@/lib/posts";
import { BLOG_ID, PERSON_ID, SITE_NAME, SITE_URL } from "@/lib/site";
import styles from "../blog.module.css";

type Params = { params: Promise<{ slug: string }> };

const PLATE_DOT = 3;

// every post is known at build time; an unknown slug should 404 without a runtime render that reads content/blog
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags.length ? post.tags : undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      publishedTime: `${post.date}T00:00:00.000Z`,
      modifiedTime: `${post.updated ?? post.date}T00:00:00.000Z`,
      authors: [SITE_URL],
      section: "Engineering",
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const [{ slug }, posts] = await Promise.all([params, getPosts()]);
  const index = posts.findIndex((candidate) => candidate.slug === slug);
  const post = posts[index];
  if (!post) notFound();

  const newer = index > 0 ? posts[index - 1] : null;
  const older = index < posts.length - 1 ? posts[index + 1] : null;
  const url = `${SITE_URL}/blog/${post.slug}`;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${url}#post`,
      mainEntityOfPage: url,
      url,
      headline: post.title,
      description: post.excerpt,
      image: `${url}/opengraph-image`,
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      inLanguage: "en",
      wordCount: post.words,
      timeRequired: `PT${post.minutes}M`,
      keywords: post.tags.length ? post.tags.join(", ") : undefined,
      author: { "@id": PERSON_ID },
      publisher: { "@id": PERSON_ID },
      isPartOf: { "@id": BLOG_ID },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <main className="column">
      <div className="top">
        <Link href="/blog" className={`chevron-link ${styles.back}`}>
          <Chevron direction="left" />
          blog
        </Link>
        <ThemeToggle />
      </div>

      <header className={styles.head}>
        <h1 className={styles.postTitle}>{post.title}</h1>
        <aside className={`glyphHost ${styles.gutter}`}>
          {post.glyph && <Glyph name={post.glyph} />}
          <span className={styles.meta}>
            <time dateTime={post.date}>{formatMonthLong(post.date)}</time>
            <span>{post.minutes} minutes</span>
          </span>
        </aside>
      </header>

      <DitherHeader seed={post.slug} dot={PLATE_DOT} className={styles.plate} />

      <article className={`prose ${styles.body}`} dangerouslySetInnerHTML={{ __html: post.html }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />

      {(newer || older) && (
        <ul className={`${styles.list} ${styles.neighbours}`}>
          {newer && <PostRow post={newer} label="Next" />}
          {older && <PostRow post={older} label="Earlier" />}
        </ul>
      )}
    </main>
  );
}
