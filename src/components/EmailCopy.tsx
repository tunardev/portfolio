"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { colors, durations, easings, fonts, spacing } from "@/styles/tokens.stylex";

const COPIED_MS = 1200;

export function EmailCopy({ address }: { address: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      window.location.href = `mailto:${address}`;
      return;
    }
    setIsCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIsCopied(false), COPIED_MS);
  }

  return (
    <span {...stylex.props(styles.wrapper)}>
      <button type="button" {...stylex.props(styles.email)} onClick={copy} aria-label={`Copy ${address}`}>
        {address}
      </button>
      <span {...stylex.props(styles.copied, isCopied && styles.copiedVisible)} aria-live="polite">
        {isCopied ? "Copied" : ""}
      </span>
    </span>
  );
}

const styles = stylex.create({
  wrapper: {
    position: "relative",
    display: "inline",
  },
  email: {
    borderBlockEndWidth: "1px",
    borderBlockEndStyle: "solid",
    borderBlockEndColor: { default: "transparent", ":hover": colors.underlineStrong },
    transition: `border-color ${durations.fast} ease`,
  },
  copied: {
    position: "absolute",
    insetBlockEnd: "calc(100% + 2px)",
    insetInlineStart: "50%",
    transform: `translate(-50%, ${spacing.xxs})`,
    fontFamily: fonts.sans,
    fontSize: "12px",
    lineHeight: "16px",
    fontWeight: 500,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    color: colors.red,
    opacity: 0,
    pointerEvents: "none",
    transition: `transform 260ms ${easings.out}, opacity ${durations.fast} ease`,
  },
  copiedVisible: {
    transform: "translate(-50%, 0)",
    opacity: 1,
  },
});
