"use client";

import * as stylex from "@stylexjs/stylex";
import { type ReactNode, useId, useState } from "react";
import { chevronLinkMarker } from "@/styles/markers.stylex";
import { shared } from "@/styles/shared";
import { colors, durations, easings, spacing } from "@/styles/tokens.stylex";
import { Chevron } from "./Chevron";

export function Lore({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const bodyId = useId();

  return (
    <div {...stylex.props(styles.lore)}>
      <button
        type="button"
        {...stylex.props(shared.chevronLink, chevronLinkMarker, styles.toggle)}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
      >
        how I got here
        <Chevron direction="down" style={isOpen && styles.chevronOpen} />
      </button>
      <div id={bodyId} {...stylex.props(styles.body, isOpen && styles.bodyOpen)} inert={!isOpen}>
        <div {...stylex.props(styles.inner, isOpen && styles.innerOpen)}>{children}</div>
      </div>
    </div>
  );
}

const styles = stylex.create({
  lore: {
    display: "flex",
    flexDirection: "column",
    inlineSize: "100%",
  },
  toggle: {
    alignSelf: "flex-start",
  },
  chevronOpen: {
    transform: "rotate(180deg)",
  },
  body: {
    display: "grid",
    gridTemplateRows: "0fr",
    transition: `grid-template-rows ${durations.calm} ${easings.out}`,
  },
  bodyOpen: {
    gridTemplateRows: "1fr",
  },
  inner: {
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
    marginBlockStart: 0,
    paddingInlineStart: spacing.xxl,
    borderInlineStartWidth: "1px",
    borderInlineStartStyle: "solid",
    borderInlineStartColor: colors.line,
    transition: `margin-block-start ${durations.calm} ${easings.out}`,
  },
  innerOpen: {
    marginBlockStart: spacing.md,
  },
});
