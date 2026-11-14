import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SITE_URL } from "@/lib/site";
import { shared } from "@/styles/shared";
import { colors, durations, fontSizes, lineHeights, radii, spacing } from "@/styles/tokens.stylex";

const COPIED_FOR = 1400;

const subscribeNever = () => () => {};

export function InviteLink({ id }: { id: string }) {
  const origin = useSyncExternalStore(
    subscribeNever,
    () => window.location.origin,
    () => SITE_URL,
  );
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const link = `${origin}/play/${id}`;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), COPIED_FOR);
  };

  return (
    <div {...stylex.props(styles.invite)}>
      <span {...stylex.props(styles.link)}>{link.replace(/^https?:\/\//, "")}</span>
      <button type="button" {...stylex.props(shared.pill)} onClick={copy}>
        Copy link
      </button>
      <span {...stylex.props(styles.copied, copied && styles.copiedVisible)} aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}

const styles = stylex.create({
  invite: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    minBlockSize: "36px",
    paddingBlock: spacing.sm,
    paddingInline: spacing.lg,
    borderRadius: radii.lg,
    fontSize: fontSizes.meta,
    lineHeight: lineHeights.small,
    fontVariantNumeric: "tabular-nums",
    overflowWrap: "anywhere",
    backgroundColor: colors.wash,
    userSelect: "all",
  },
  copied: {
    display: "inline-block",
    minInlineSize: "3.5em",
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
    color: colors.red,
    opacity: 0,
    transition: `opacity ${durations.fast} ease`,
  },
  copiedVisible: {
    opacity: 1,
  },
});
