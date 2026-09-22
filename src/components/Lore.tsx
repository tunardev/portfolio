"use client";

import { useId, useState, type ReactNode } from "react";
import { Chevron } from "./Chevron";
import styles from "./Lore.module.css";

export function Lore({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <div className={styles.lore}>
      <button
        type="button"
        className={`chevron-link ${styles.toggle}`}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        how I got here
        <Chevron direction="down" />
      </button>
      <div id={bodyId} className={styles.body} data-open={open || undefined} inert={!open}>
        <div className={styles.inner}>{children}</div>
      </div>
    </div>
  );
}
