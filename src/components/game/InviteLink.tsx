import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SITE_URL } from "@/lib/site";
import styles from "./FourInARow.module.css";

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
    <div className={styles.invite}>
      <span className={styles.link}>{link.replace(/^https?:\/\//, "")}</span>
      <button type="button" className="pill" onClick={copy}>
        Copy link
      </button>
      <span className={styles.copied} data-on={copied || undefined} aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
