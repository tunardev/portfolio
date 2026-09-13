const PATHS = {
  right: "M3.5 2 L6.5 5 L3.5 8",
  left: "M6.5 2 L3.5 5 L6.5 8",
  down: "M2 3.5 L5 6.5 L8 3.5",
} as const;

export function Chevron({ direction = "right" }: { direction?: keyof typeof PATHS }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d={PATHS[direction]} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
