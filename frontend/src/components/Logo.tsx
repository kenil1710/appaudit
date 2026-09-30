/** The mark: a shield with an eye inside it — "watching privacy". */
export function Logomark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M32 4 8 13v17c0 15 10.2 26.3 24 30 13.8-3.7 24-15 24-30V13L32 4Z"
        fill="#0D0D1A"
        stroke="#00E5FF"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M15 32c4.6-7 10.4-10.5 17-10.5S44.4 25 49 32c-4.6 7-10.4 10.5-17 10.5S19.6 39 15 32Z"
        stroke="#00E5FF"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="6" fill="#00E5FF" />
      <circle cx="34" cy="30" r="1.8" fill="#0D0D1A" />
      <path d="M18 47h28" stroke="#B794F6" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

export function Wordmark({ badge = true }: { badge?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <Logomark />
      <span className="mono" style={{ fontWeight: 700, fontSize: "1.05rem" }}>
        App<span style={{ color: "var(--cyan)" }}>Audit</span>
      </span>
      {badge && (
        <span className="mono" title="Version 2" style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--line-strong)", color: "var(--lavender)", lineHeight: 1.3 }}>
          v2
        </span>
      )}
    </span>
  );
}
