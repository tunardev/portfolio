import type { GlyphName } from "@/lib/glyphs";
import styles from "./Glyph.module.css";

export function Glyph({ name }: { name: GlyphName }) {
  return (
    <svg
      className={styles.glyph}
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      {name === "raft" && (
        <g strokeWidth="1.3">
          <path d="M14 8 L7 20 M14 8 L21 20 M7 20 H21" className={styles.soft} />
          <circle cx="7" cy="20" r="2.8" fill="var(--paper)" />
          <circle cx="21" cy="20" r="2.8" fill="var(--paper)" />
          <circle cx="14" cy="8" r="2.8" fill="var(--paper)" />
          <circle cx="14" cy="8" r="5.6" className={`${styles.hot} ${styles.ring}`} />
        </g>
      )}
      {name === "wal" && (
        <g strokeWidth="1.2">
          <rect x="1.5" y="10.5" width="4.4" height="7" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="7" y="10.5" width="4.4" height="7" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="12.5" y="10.5" width="4.4" height="7" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="18" y="10.5" width="4.4" height="7" rx="1" fill="var(--paper)" />
          <rect
            x="23.5"
            y="10.5"
            width="4.4"
            height="7"
            rx="1"
            strokeDasharray="2 2"
            className={`${styles.hot} ${styles.cell}`}
          />
        </g>
      )}
      {name === "ring" && (
        <g strokeWidth="1.3">
          <circle cx="14" cy="14" r="10" className={styles.soft} />
          <circle cx="14" cy="4" r="2" fill="var(--paper)" />
          <circle cx="23.5" cy="17" r="2" fill="var(--paper)" />
          <circle cx="4.5" cy="17" r="2" fill="var(--paper)" />
          <g className={`${styles.hot} ${styles.orbit}`}>
            <circle cx="21" cy="7" r="1.6" fill="currentColor" stroke="none" />
          </g>
        </g>
      )}
      {name === "backprop" && (
        <g strokeWidth="1.2">
          <path d="M5 9 L14 6 M5 9 L14 14 M5 9 L14 22 M5 19 L14 6 M5 19 L14 14 M5 19 L14 22" className={styles.soft} />
          <path d="M14 6 L23 14 M14 14 L23 14 M14 22 L23 14" className={`${styles.hot} ${styles.wire}`} />
          {[
            [5, 9],
            [5, 19],
            [14, 6],
            [14, 14],
            [14, 22],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="var(--paper)" />
          ))}
          <circle cx="23" cy="14" r="2.2" fill="currentColor" />
        </g>
      )}
      {name === "merkle" && (
        <g strokeWidth="1.2">
          <path d="M14 6 L8 14 M14 6 L20 14 M8 14 L5 22 M8 14 L11 22 M20 14 L23 22" className={styles.soft} />
          <path d="M17 22 L20 14 L14 6" className={`${styles.hot} ${styles.wire}`} />
          <rect x="11.5" y="4" width="5" height="4" rx="1" fill="var(--paper)" />
          <rect x="5.5" y="12" width="5" height="4" rx="1" fill="var(--paper)" />
          <rect x="17.5" y="12" width="5" height="4" rx="1" fill="var(--paper)" />
          <rect x="2.5" y="20" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="8.5" y="20" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="20.5" y="20" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="14.5" y="20" width="5" height="4" rx="1" className={`${styles.hot} ${styles.leaf}`} />
        </g>
      )}
      {name === "move" && (
        <g strokeWidth="1.2">
          <path d="M17 14 H26 M23 11 L26 14 L23 17" className={styles.soft} />
          <g className={`${styles.hot} ${styles.slide}`}>
            <rect x="2" y="10.5" width="4.4" height="7" rx="1" fill="currentColor" fillOpacity="0.14" />
            <rect x="7.5" y="10.5" width="4.4" height="7" rx="1" fill="currentColor" fillOpacity="0.14" />
            <rect x="13" y="10.5" width="4.4" height="7" rx="1" fill="var(--paper)" />
          </g>
        </g>
      )}
    </svg>
  );
}
