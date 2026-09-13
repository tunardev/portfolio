import { ImageResponse } from "next/og";
import { OG_DOMAIN, OG_SIZE, OgCard, ogFonts } from "@/lib/og/card";
import { formatMonthLong, getPost } from "@/lib/posts";
import { AUTHOR, SITE_NAME } from "@/lib/site";

export const alt = `Blog post by ${AUTHOR}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  const line = post ? `${formatMonthLong(post.date)}, ${post.minutes} minutes` : `A note by ${AUTHOR}`;

  return new ImageResponse(
    <OgCard title={post?.title ?? SITE_NAME} line={line} seed={slug} kicker={`${OG_DOMAIN}/blog`} />,
    { ...size, fonts: await ogFonts() },
  );
}
