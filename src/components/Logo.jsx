export default function Logo({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ConsorcioTrust logo"
    >
      {/* Building silhouette */}
      <rect x="6" y="14" width="28" height="22" rx="2" fill="#0d9488" />
      <rect x="10" y="8" width="20" height="8" rx="1.5" fill="#0f766e" />
      <rect x="15" y="4" width="10" height="6" rx="1" fill="#115e59" />

      {/* Windows */}
      <rect x="10" y="18" width="5" height="4" rx="0.5" fill="#ccfbf1" opacity="0.9" />
      <rect x="18" y="18" width="5" height="4" rx="0.5" fill="#ccfbf1" opacity="0.9" />
      <rect x="26" y="18" width="5" height="4" rx="0.5" fill="#ccfbf1" opacity="0.9" />
      <rect x="10" y="25" width="5" height="4" rx="0.5" fill="#ccfbf1" opacity="0.7" />
      <rect x="26" y="25" width="5" height="4" rx="0.5" fill="#ccfbf1" opacity="0.7" />

      {/* Door */}
      <rect x="16" y="28" width="8" height="8" rx="1" fill="#99f6e4" opacity="0.9" />

      {/* Shield / checkmark overlay */}
      <circle cx="30" cy="10" r="8" fill="#f59e0b" />
      <path
        d="M26.5 10L29 12.5L33.5 8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
