import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import Link from "next/link";
import { DitherHeader } from "@/components/DitherHeader";
import { PORTRAIT_KINDS } from "@/components/scenes";
import { shared } from "@/styles/shared";
import { colors, fontSizes, lineHeights, sizes, spacing, tints } from "@/styles/tokens.stylex";

export const metadata: Metadata = {
  title: "Nothing here",
};

export default function NotFound() {
  return (
    <main {...stylex.props(styles.page)}>
      <DitherHeader animate={false} kinds={PORTRAIT_KINDS} seed="nothing-here" full style={styles.scene} />

      <p {...stylex.props(styles.note)}>
        <span {...stylex.props(styles.lead)}>Nothing here.</span>
        <Link href="/" {...stylex.props(shared.underline)}>
          home
        </Link>
      </p>
    </main>
  );
}

const SMALL_SCREEN = "@media (max-width: 520px)";

const styles = stylex.create({
  page: {
    position: "relative",
    overflow: "hidden",
    minBlockSize: "100dvh",
    color: colors.ink,
    backgroundColor: tints.sage,
  },
  scene: {
    position: "absolute",
    inset: 0,
  },
  note: {
    position: "absolute",
    insetBlockStart: { default: spacing.xxxl, [SMALL_SCREEN]: sizes.gutter },
    insetInline: { default: spacing.xxxl, [SMALL_SCREEN]: sizes.gutter },
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: { default: spacing.lg, [SMALL_SCREEN]: spacing.md },
    margin: 0,
    fontSize: fontSizes.ui,
    lineHeight: lineHeights.ui,
  },
  lead: {
    fontWeight: 500,
  },
});
