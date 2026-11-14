import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chevron } from "@/components/Chevron";
import { DitherHeader } from "@/components/DitherHeader";
import { Glyph } from "@/components/Glyph";
import { PostList } from "@/components/PostList";
import { PostRow } from "@/components/PostRow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { jsonLdScript } from "@/lib/jsonld";
import { formatMonthLong, getPost, getPosts, type PostElementClassNames, renderMarkdown } from "@/lib/posts";
import { BLOG_ID, PERSON_ID, SITE_NAME, SITE_URL } from "@/lib/site";
import { chevronLinkMarker, glyphHostMarker } from "@/styles/markers.stylex";
import { shared } from "@/styles/shared";
import {
  breakpoints,
  colors,
  fonts,
  fontSizes,
  lineHeights,
  radii,
  sizes,
  spacing,
  tints,
} from "@/styles/tokens.stylex";

type Params = { params: Promise<{ slug: string }> };

const PLATE_DOT = 3;

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
  const bodyClassNames: PostElementClassNames = {
    link: stylex.props(shared.underline).className,
    code: stylex.props(styles.code).className,
    heading2: stylex.props(styles.heading2).className,
    list: stylex.props(styles.bodyList).className,
  };

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
    <main {...stylex.props(shared.column)}>
      <div {...stylex.props(shared.header)}>
        <Link href="/blog" {...stylex.props(shared.chevronLink, chevronLinkMarker, styles.backLink)}>
          <Chevron direction="left" />
          blog
        </Link>
        <ThemeToggle />
      </div>

      <header {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.title)}>{post.title}</h1>
        <aside {...stylex.props(styles.gutter, glyphHostMarker)}>
          {post.glyph && <Glyph name={post.glyph} />}
          <span {...stylex.props(styles.meta)}>
            <time dateTime={post.date}>{formatMonthLong(post.date)}</time>
            <span {...stylex.props(styles.minutes)}>{post.minutes} minutes</span>
          </span>
        </aside>
      </header>

      <DitherHeader seed={post.slug} dot={PLATE_DOT} style={styles.plate} />

      <article
        {...stylex.props(shared.prose, styles.body)}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.markdown, bodyClassNames) }}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />

      {(newer || older) && (
        <PostList style={styles.neighbors}>
          {newer && <PostRow post={newer} label="Next" />}
          {older && <PostRow post={older} label="Earlier" />}
        </PostList>
      )}
    </main>
  );
}

const styles = stylex.create({
  backLink: {
    fontSize: fontSizes.ui,
    lineHeight: lineHeights.ui,
  },
  header: {
    position: "relative",
    inlineSize: "100%",
  },
  title: {
    marginBlockStart: spacing.sm,
    marginBlockEnd: 0,
    fontFamily: fonts.serif,
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    fontWeight: 400,
    letterSpacing: "-0.01em",
    textWrap: "balance",
  },
  gutter: {
    position: { default: null, [breakpoints.wide]: "absolute" },
    insetBlockStart: { default: null, [breakpoints.wide]: 0 },
    insetInlineEnd: { default: null, [breakpoints.wide]: `calc(100% + ${sizes.marginGap})` },
    display: "flex",
    flexDirection: { default: null, [breakpoints.wide]: "column" },
    alignItems: { default: "center", [breakpoints.wide]: "flex-end" },
    gap: { default: spacing.md, [breakpoints.wide]: "10px", [breakpoints.mobile]: "10px" },
    inlineSize: { default: null, [breakpoints.wide]: sizes.marginNote },
    paddingBlockStart: "10px",
    textAlign: { default: null, [breakpoints.wide]: "end" },
    color: colors.inkSoft,
  },
  meta: {
    display: "flex",
    flexDirection: { default: null, [breakpoints.wide]: "column" },
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    fontVariantNumeric: "tabular-nums",
    color: colors.inkSoft,
  },
  minutes: {
    "::before": {
      content: { default: '", "', [breakpoints.wide]: "none" },
    },
  },
  plate: {
    inlineSize: "100%",
    blockSize: { default: "240px", [breakpoints.mobile]: "170px" },
    marginBlockStart: spacing.sm,
    marginBlockEnd: spacing.xxs,
    backgroundColor: tints.sage,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.lg,
    paddingBlockStart: spacing.md,
  },
  code: {
    paddingBlock: "1px",
    paddingInline: "5px",
    borderRadius: radii.sm,
    fontFamily: fonts.mono,
    fontSize: fontSizes.meta,
    backgroundColor: colors.wash,
  },
  heading2: {
    marginBlockStart: spacing.lg,
    marginBlockEnd: 0,
    fontSize: fontSizes.section,
    lineHeight: lineHeights.section,
    fontWeight: 500,
  },
  bodyList: {
    margin: 0,
    paddingInlineStart: "22px",
  },
  neighbors: {
    marginBlockStart: { default: spacing.xxxl, [breakpoints.mobile]: "28px" },
  },
});
