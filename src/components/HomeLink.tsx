import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { MarkIcon } from "@/components/Mark";
import { SITE_NAME } from "@/lib/site";
import { siteNameMarker } from "@/styles/markers.stylex";
import { shared } from "@/styles/shared";
import { colors, durations, easings, radii, sizes } from "@/styles/tokens.stylex";

export function HomeLink() {
  return (
    <Link href="/" {...stylex.props(shared.siteName, siteNameMarker)}>
      <span {...stylex.props(styles.markSlot)}>
        <MarkIcon />
      </span>
      <span>{SITE_NAME}</span>
    </Link>
  );
}

const styles = stylex.create({
  markSlot: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: sizes.control,
    blockSize: sizes.control,
    borderRadius: radii.md,
    transform: {
      default: null,
      [stylex.when.ancestor(":hover", siteNameMarker)]: "rotate(-8deg) translateY(-1px)",
      [stylex.when.ancestor(":focus-visible", siteNameMarker)]: "rotate(-8deg) translateY(-1px)",
    },
    backgroundColor: {
      default: null,
      [stylex.when.ancestor(":hover", siteNameMarker)]: colors.wash,
      [stylex.when.ancestor(":focus-visible", siteNameMarker)]: colors.wash,
    },
    transition: `transform ${durations.base} ${easings.out}, background-color ${durations.fast} ease`,
  },
});
