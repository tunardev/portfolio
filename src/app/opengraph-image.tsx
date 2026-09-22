import { ImageResponse } from "next/og";
import { OG_DOMAIN, OG_SIZE, ogFonts } from "@/lib/og/assets";
import { OgCard } from "@/lib/og/card";
import { AUTHOR, SITE_NAME } from "@/lib/site";

const CARD_LINE = "Self-taught engineer, 18. How big tech actually works, piece by piece.";

export const alt = `${AUTHOR}, self-taught engineer working on distributed systems and machine learning`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(<OgCard title={SITE_NAME} line={CARD_LINE} seed={OG_DOMAIN} />, {
    ...size,
    fonts: await ogFonts(),
  });
}
