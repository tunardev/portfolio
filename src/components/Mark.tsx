export function MarkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        d="M2.5 4.2H5.3A1.7 1.7 0 1 1 8.7 4.2H11.5V7A1.7 1.7 0 1 1 11.5 10.4V13.2H2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TileMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ display: "block" }}>
      <rect width="16" height="16" rx="3.6" fill="currentColor" />
      <path d="M2.6 5.2H5.4A1.9 1.9 0 1 1 9.2 5.2H11.6V7.5A1.9 1.9 0 1 1 11.6 11.3V12.8H2.6Z" fill="var(--paper)" />
    </svg>
  );
}
