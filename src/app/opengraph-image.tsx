import { ImageResponse } from "next/og";
import { OG_DOMAIN, OG_SIZE, ogFonts } from "@/lib/og/assets";
import { OgCard } from "@/lib/og/card";
import { calculateAge } from "@/lib/calculate-age";
import { AUTHOR, AUTHOR_BIRTH_DATE, SITE_NAME } from "@/lib/site";

export const alt = `${AUTHOR}, self-taught engineer working on distributed systems and machine learning`;
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 86400;

export default async function Image() {
  const line = `Self-taught engineer, ${calculateAge(AUTHOR_BIRTH_DATE)}. How big tech actually works, piece by piece.`;
  return new ImageResponse(<OgCard title={SITE_NAME} line={line} seed={OG_DOMAIN} />, {
    ...size,
    fonts: await ogFonts(),
  });
}
