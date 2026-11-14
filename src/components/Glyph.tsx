import * as stylex from "@stylexjs/stylex";
import type { GlyphName } from "@/lib/glyphs";
import { glyphHostMarker } from "@/styles/markers.stylex";
import { colors, durations, easings } from "@/styles/tokens.stylex";

export function Glyph({ name }: { name: GlyphName }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      {...stylex.props(styles.glyph)}
    >
      {name === "raft" && (
        <g strokeWidth="1.3">
          <path d="M14 8 L7 20 M14 8 L21 20 M7 20 H21" {...stylex.props(styles.muted)} />
          <circle cx="7" cy="20" r="2.8" fill={colors.paper} />
          <circle cx="21" cy="20" r="2.8" fill={colors.paper} />
          <circle cx="14" cy="8" r="2.8" fill={colors.paper} />
          <circle cx="14" cy="8" r="5.6" {...stylex.props(styles.highlight, styles.ring)} />
        </g>
      )}
      {name === "wal" && (
        <g strokeWidth="1.2">
          <rect x="1.5" y="10.5" width="4.4" height="7" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="7" y="10.5" width="4.4" height="7" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="12.5" y="10.5" width="4.4" height="7" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="18" y="10.5" width="4.4" height="7" rx="1" fill={colors.paper} />
          <rect
            x="23.5"
            y="10.5"
            width="4.4"
            height="7"
            rx="1"
            strokeDasharray="2 2"
            {...stylex.props(styles.highlight, styles.cell)}
          />
        </g>
      )}
      {name === "ring" && (
        <g strokeWidth="1.3">
          <circle cx="14" cy="14" r="10" {...stylex.props(styles.muted)} />
          <circle cx="14" cy="4" r="2" fill={colors.paper} />
          <circle cx="23.5" cy="17" r="2" fill={colors.paper} />
          <circle cx="4.5" cy="17" r="2" fill={colors.paper} />
          <g {...stylex.props(styles.highlight, styles.orbit)}>
            <circle cx="21" cy="7" r="1.6" fill="currentColor" stroke="none" />
          </g>
        </g>
      )}
      {name === "backprop" && (
        <g strokeWidth="1.2">
          <path
            d="M5 9 L14 6 M5 9 L14 14 M5 9 L14 22 M5 19 L14 6 M5 19 L14 14 M5 19 L14 22"
            {...stylex.props(styles.muted)}
          />
          <path d="M14 6 L23 14 M14 14 L23 14 M14 22 L23 14" {...stylex.props(styles.highlight, styles.wire)} />
          {[
            [5, 9],
            [5, 19],
            [14, 6],
            [14, 14],
            [14, 22],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={colors.paper} />
          ))}
          <circle cx="23" cy="14" r="2.2" fill="currentColor" />
        </g>
      )}
      {name === "merkle" && (
        <g strokeWidth="1.2">
          <path d="M14 6 L8 14 M14 6 L20 14 M8 14 L5 22 M8 14 L11 22 M20 14 L23 22" {...stylex.props(styles.muted)} />
          <path d="M17 22 L20 14 L14 6" {...stylex.props(styles.highlight, styles.wire)} />
          <rect x="11.5" y="4" width="5" height="4" rx="1" fill={colors.paper} />
          <rect x="5.5" y="12" width="5" height="4" rx="1" fill={colors.paper} />
          <rect x="17.5" y="12" width="5" height="4" rx="1" fill={colors.paper} />
          <rect x="2.5" y="20" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="8.5" y="20" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="20.5" y="20" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.14" />
          <rect x="14.5" y="20" width="5" height="4" rx="1" {...stylex.props(styles.highlight, styles.leaf)} />
        </g>
      )}
      {name === "move" && (
        <g strokeWidth="1.2">
          <path d="M17 14 H26 M23 11 L26 14 L23 17" {...stylex.props(styles.muted)} />
          <g {...stylex.props(styles.highlight, styles.slide)}>
            <rect x="2" y="10.5" width="4.4" height="7" rx="1" fill="currentColor" fillOpacity="0.14" />
            <rect x="7.5" y="10.5" width="4.4" height="7" rx="1" fill="currentColor" fillOpacity="0.14" />
            <rect x="13" y="10.5" width="4.4" height="7" rx="1" fill={colors.paper} />
          </g>
        </g>
      )}
    </svg>
  );
}

const styles = stylex.create({
  glyph: {
    display: "block",
    overflow: "visible",
    flexShrink: 0,
    color: colors.ink,
  },
  muted: {
    stroke: `color-mix(in srgb, ${colors.ink} 30%, transparent)`,
  },
  highlight: {
    transition: `stroke ${durations.base} ease, fill ${durations.base} ease, opacity ${durations.base} ease, transform ${durations.draw} ${easings.out}, stroke-dashoffset ${durations.draw} ${easings.out}`,
  },
  ring: {
    stroke: colors.red,
    opacity: {
      default: 0,
      [stylex.when.ancestor(":hover", glyphHostMarker)]: 1,
      [stylex.when.ancestor(":focus-visible", glyphHostMarker)]: 1,
    },
  },
  cell: {
    fill: {
      default: colors.paper,
      [stylex.when.ancestor(":hover", glyphHostMarker)]: `color-mix(in srgb, ${colors.red} 14%, transparent)`,
      [stylex.when.ancestor(":focus-visible", glyphHostMarker)]: `color-mix(in srgb, ${colors.red} 14%, transparent)`,
    },
    stroke: {
      default: `color-mix(in srgb, ${colors.ink} 40%, transparent)`,
      [stylex.when.ancestor(":hover", glyphHostMarker)]: colors.red,
      [stylex.when.ancestor(":focus-visible", glyphHostMarker)]: colors.red,
    },
    strokeDasharray: {
      default: null,
      [stylex.when.ancestor(":hover", glyphHostMarker)]: "none",
      [stylex.when.ancestor(":focus-visible", glyphHostMarker)]: "none",
    },
  },
  orbit: {
    transformOrigin: "14px 14px",
    color: {
      default: colors.ink,
      [stylex.when.ancestor(":hover", glyphHostMarker)]: colors.red,
      [stylex.when.ancestor(":focus-visible", glyphHostMarker)]: colors.red,
    },
    stroke: "none",
    transform: {
      default: null,
      [stylex.when.ancestor(":hover", glyphHostMarker)]: "rotate(120deg)",
      [stylex.when.ancestor(":focus-visible", glyphHostMarker)]: "rotate(120deg)",
    },
  },
  wire: {
    stroke: colors.red,
    strokeDasharray: "40",
    strokeDashoffset: {
      default: "40",
      [stylex.when.ancestor(":hover", glyphHostMarker)]: "0",
      [stylex.when.ancestor(":focus-visible", glyphHostMarker)]: "0",
    },
  },
  leaf: {
    fill: {
      default: colors.paper,
      [stylex.when.ancestor(":hover", glyphHostMarker)]: colors.red,
      [stylex.when.ancestor(":focus-visible", glyphHostMarker)]: colors.red,
    },
    stroke: {
      default: null,
      [stylex.when.ancestor(":hover", glyphHostMarker)]: colors.red,
      [stylex.when.ancestor(":focus-visible", glyphHostMarker)]: colors.red,
    },
  },
  slide: {
    transform: {
      default: "translateX(0)",
      [stylex.when.ancestor(":hover", glyphHostMarker)]: "translateX(3px)",
      [stylex.when.ancestor(":focus-visible", glyphHostMarker)]: "translateX(3px)",
    },
  },
});
