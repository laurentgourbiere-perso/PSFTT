/** Logo TournoiBox : une boîte dont le couvercle s'ouvre sur un trophée. */
export function Logo({ size = 32, withName = true }: { size?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <rect x="4" y="18" width="32" height="18" rx="4" fill="#7c5cff" />
        <path d="M4 18 L8 10 L32 10 L36 18 Z" fill="#b6a3ff" />
        <path d="M14 6 h12 v4 a6 6 0 0 1 -12 0 Z" fill="#c6f24e" />
        <rect x="18.5" y="15" width="3" height="5" fill="#c6f24e" />
        <rect x="12" y="25" width="16" height="3" rx="1.5" fill="#0c0f1d" opacity=".35" />
      </svg>
      {withName && (
        <span className="font-display text-xl font-bold tracking-tight">
          Tournoi<span className="text-lime">Box</span>
        </span>
      )}
    </span>
  );
}
