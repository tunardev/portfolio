"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./EmailCopy.module.css";

const COPIED_MS = 1200;

export function EmailCopy({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      window.location.href = `mailto:${address}`;
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.email} onClick={copy} aria-label={`Copy ${address}`}>
        {address}
      </button>
      <span className={styles.copied} data-on={copied || undefined} aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </span>
  );
}
