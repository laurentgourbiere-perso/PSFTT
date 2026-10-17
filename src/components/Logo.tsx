// Proposition de logo modernisé : l'écusson jaune/bleu et les deux raquettes du logo historique,
// redessinés en aplats nets, avec la balle en mouvement.
export function LogoMark({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <clipPath id="psftt-shield">
          <path d="M60 8 L102 22 V58 C102 84 84 102 60 112 C36 102 18 84 18 58 V22 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#psftt-shield)">
        <rect x="0" y="0" width="120" height="120" fill="#0b3c8c" />
        <path d="M0 0 H120 L0 120 Z" fill="#ffd400" />
      </g>
      <path d="M60 8 L102 22 V58 C102 84 84 102 60 112 C36 102 18 84 18 58 V22 Z" fill="none" stroke="#0a1633" strokeWidth="5" strokeLinejoin="round" />
      {/* Raquette rouge */}
      <g transform="rotate(-35 60 60)">
        <rect x="56" y="62" width="9" height="30" rx="4" fill="#0a1633" />
        <circle cx="60.5" cy="45" r="21" fill="#e30613" stroke="#0a1633" strokeWidth="4" />
      </g>
      {/* Raquette noire */}
      <g transform="rotate(35 60 60)">
        <rect x="56" y="62" width="9" height="30" rx="4" fill="#0a1633" />
        <circle cx="60.5" cy="45" r="21" fill="#141414" stroke="#0a1633" strokeWidth="4" />
      </g>
      {/* Balle et traînée */}
      <path d="M74 20 Q86 14 96 20" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".7" />
      <circle cx="100" cy="24" r="8" fill="#fff" stroke="#0a1633" strokeWidth="3" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className={compact ? "h-9 w-9" : "h-12 w-12"} />
      <span className="leading-none">
        <span className="font-display block text-2xl tracking-wide text-white italic">PSFTT</span>
        {!compact && (
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-300">
            Pontcharra · Saint-Forgeux
          </span>
        )}
      </span>
    </span>
  );
}
