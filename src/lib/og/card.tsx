import { readFile } from "node:fs/promises";
import path from "node:path";
import { pickScene } from "@/components/scenes";
import { sceneSvg } from "@/components/sceneSvg";
import { SITE_URL } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_DOMAIN = SITE_URL.replace(/^https?:\/\//, "");

const PLATE = { width: OG_SIZE.width, height: 320 };
const PLATE_DOT = 3;
const PLATE_PATTERN_ID = "og";

const LONG_TITLE_CHARS = 40;
const TITLE_SIZE = 58;
const LONG_TITLE_SIZE = 50;

const PAPER = "#FFFFFF";
const INK = "#1A1917";
const INK_SOFT = "#75726D";

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

type Props = { title: string; line: string; seed: string; kicker?: string };

export function OgCard({ title, line, seed, kicker = OG_DOMAIN }: Props) {
  const scene = pickScene(seed, PLATE);
  const plateSvg = sceneSvg(scene, { dot: PLATE_DOT, id: PLATE_PATTERN_ID });
  const plateSrc = `data:image/svg+xml;base64,${Buffer.from(plateSvg).toString("base64")}`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: PAPER,
        color: INK,
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "64px 72px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: INK_SOFT }}>
          <span>{kicker}</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: title.length > LONG_TITLE_CHARS ? LONG_TITLE_SIZE : TITLE_SIZE,
            lineHeight: 1.12,
            fontWeight: 500,
            letterSpacing: -1,
            maxWidth: 960,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 26, lineHeight: 1.35, color: INK_SOFT, maxWidth: 900 }}>
          {line}
        </div>
      </div>
      <img src={plateSrc} width={PLATE.width} height={PLATE.height} style={{ display: "flex" }} alt="" />
    </div>
  );
}
