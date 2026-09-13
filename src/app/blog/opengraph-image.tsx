import { ImageResponse } from "next/og";
import { OG_DOMAIN, OG_SIZE, OgCard, ogFonts } from "@/lib/og/card";
import { AUTHOR, BLOG_TAGLINE } from "@/lib/site";

export const alt = `${AUTHOR}'s blog`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <OgCard title="Blog" line={BLOG_TAGLINE} seed={`${OG_DOMAIN}/blog`} kicker={`${OG_DOMAIN}/blog`} />,
    { ...size, fonts: await ogFonts() },
  );
}
