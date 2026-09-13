"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./EmailCopy.module.css";

export function EmailCopy({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      window.location.href = `mailto:${address}`;
      return;
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.email} onClick={copy}>
        {address}
      </button>
      <span className={styles.copied} data-on={copied ? "" : undefined} aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </span>
  );
}
