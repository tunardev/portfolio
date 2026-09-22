import { pickScene } from "@/components/scenes";
import { sceneSvg } from "@/components/sceneSvg";
import { OG_DOMAIN, OG_SIZE } from "./assets";

const PLATE = { width: OG_SIZE.width, height: 320 };
const PLATE_DOT = 3;
const PLATE_PATTERN_ID = "og";

const LONG_TITLE_CHARS = 40;
const TITLE_SIZE = 58;
const LONG_TITLE_SIZE = 50;

const PAPER = "#FFFFFF";
const INK = "#1A1917";
const INK_SOFT = "#75726D";

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
        <div style={{ display: "flex", fontSize: 22, color: INK_SOFT }}>{kicker}</div>
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
