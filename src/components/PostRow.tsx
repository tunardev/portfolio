import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { Glyph } from "@/components/Glyph";
import { formatMonth, type Post } from "@/lib/posts";
import { glyphHostMarker, postRowMarker } from "@/styles/markers.stylex";
import { shared } from "@/styles/shared";
import {
  breakpoints,
  colors,
  durations,
  easings,
  fontSizes,
  lineHeights,
  sizes,
  spacing,
} from "@/styles/tokens.stylex";

export function PostRow({ post, label }: { post: Post; label?: string }) {
  return (
    <li>
      <Link href={`/blog/${post.slug}`} {...stylex.props(styles.row, glyphHostMarker, postRowMarker)}>
        <span {...stylex.props(styles.line)}>
          <span {...stylex.props(styles.slot)}>{post.glyph && <Glyph name={post.glyph} />}</span>
          <span {...stylex.props(shared.prose, styles.title)}>
            {label && <span {...stylex.props(styles.label)}>{label} </span>}
            {post.title}
          </span>
          <time dateTime={post.date} {...stylex.props(styles.date)}>
            {formatMonth(post.date)}
          </time>
        </span>
        <span {...stylex.props(styles.minutes)}>{post.minutes} min</span>
        <span {...stylex.props(styles.reveal)}>
          <span {...stylex.props(styles.excerpt)}>{post.excerpt}</span>
        </span>
      </Link>
    </li>
  );
}

const SLOT_SIZE = "28px";

const styles = stylex.create({
  row: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    paddingBlockStart: { default: "14px", [breakpoints.mobile]: spacing.md },
    paddingBlockEnd: { default: "14px", [breakpoints.mobile]: spacing.md },
    borderBlockStartWidth: "1px",
    borderBlockStartStyle: "solid",
    borderBlockStartColor: colors.line,
  },
  line: {
    display: { default: "flex", [breakpoints.mobile]: "grid" },
    gridTemplateColumns: { default: null, [breakpoints.mobile]: `${SLOT_SIZE} 1fr` },
    alignItems: { default: "center", [breakpoints.mobile]: "start" },
    columnGap: spacing.lg,
    rowGap: { default: spacing.lg, [breakpoints.mobile]: "2px" },
  },
  slot: {
    flexShrink: 0,
    inlineSize: SLOT_SIZE,
    blockSize: SLOT_SIZE,
    gridRow: { default: null, [breakpoints.mobile]: "1 / span 2" },
    marginBlockStart: { default: null, [breakpoints.mobile]: "3px" },
  },
  title: {
    flexGrow: 1,
    gridColumn: { default: null, [breakpoints.mobile]: "2" },
  },
  label: {
    color: colors.inkSoft,
  },
  date: {
    position: { default: null, [breakpoints.wide]: "absolute" },
    insetBlockStart: { default: null, [breakpoints.wide]: "19px" },
    insetInlineEnd: { default: null, [breakpoints.wide]: `calc(100% + ${sizes.marginGap})` },
    flexShrink: 0,
    gridColumn: { default: null, [breakpoints.mobile]: "2" },
    inlineSize: { default: null, [breakpoints.wide]: sizes.marginNote },
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    fontVariantNumeric: "tabular-nums",
    textAlign: { default: null, [breakpoints.wide]: "end" },
    color: {
      default: colors.inkSoft,
      [stylex.when.ancestor(":hover", postRowMarker)]: colors.ink,
      [stylex.when.ancestor(":focus-visible", postRowMarker)]: colors.ink,
    },
    transition: `color ${durations.base} ease`,
  },
  minutes: {
    position: "absolute",
    insetBlockStart: "19px",
    insetInlineStart: `calc(100% + ${sizes.marginGap})`,
    display: { default: "none", [breakpoints.wide]: "block" },
    inlineSize: sizes.marginNote,
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    color: colors.inkSoft,
  },
  reveal: {
    display: { default: "grid", [breakpoints.mobile]: "none" },
    gridTemplateRows: {
      default: "0fr",
      [stylex.when.ancestor(":hover", postRowMarker)]: "1fr",
      [stylex.when.ancestor(":focus-visible", postRowMarker)]: "1fr",
    },
    transition: `grid-template-rows ${durations.calm} ${easings.out}`,
  },
  excerpt: {
    display: "block",
    overflow: "hidden",
    paddingInlineStart: `calc(${SLOT_SIZE} + ${spacing.lg})`,
    paddingBlockStart: {
      default: null,
      [stylex.when.ancestor(":hover", postRowMarker)]: spacing.xs,
      [stylex.when.ancestor(":focus-visible", postRowMarker)]: spacing.xs,
    },
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    color: colors.inkSoft,
    opacity: {
      default: 0,
      [stylex.when.ancestor(":hover", postRowMarker)]: 1,
      [stylex.when.ancestor(":focus-visible", postRowMarker)]: 1,
    },
    transition: `opacity 260ms ease, padding-block-start ${durations.calm} ${easings.out}`,
  },
});
