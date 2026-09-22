import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE_URL } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_DOMAIN = SITE_URL.replace(/^https?:\/\//, "");

export async function ogFonts() {
  const dir = path.join(process.cwd(), "src", "lib", "og");
  const [medium, regular] = await Promise.all([
    readFile(path.join(dir, "Geist-Medium.ttf")),
    readFile(path.join(dir, "Geist-Regular.ttf")),
  ]);
  const toArrayBuffer = (font: Buffer) =>
    font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer;

  return [
    { name: "Geist", data: toArrayBuffer(medium), weight: 500 as const, style: "normal" as const },
    { name: "Geist", data: toArrayBuffer(regular), weight: 400 as const, style: "normal" as const },
  ];
}
