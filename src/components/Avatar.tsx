import { type AvatarConfig, DEFAULT_AVATAR } from "@/lib/avatar";

export function BallAvatar({ config = DEFAULT_AVATAR, className = "h-24 w-24" }: { config?: AvatarConfig; className?: string }) {
  const c = config;
  const ink = "#141414";
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Avatar">
      <rect width="100" height="100" fill={c.bg} />
      <circle cx="18" cy="20" r="30" fill="#fff" opacity=".08" />
      <ellipse cx="50" cy="92" rx="26" ry="5" fill="#000" opacity=".25" />
      <circle cx="50" cy="55" r="32" fill={c.ball} stroke={ink} strokeWidth="3" />
      <path d="M26 44 Q50 36 74 44" stroke={ink} strokeWidth="1.5" fill="none" opacity=".25" />
      <ellipse cx="38" cy="40" rx="8" ry="5" fill="#fff" opacity=".6" />

      {/* Yeux */}
      {c.eyes === "normal" && (<><circle cx="40" cy="52" r="4" fill={ink} /><circle cx="60" cy="52" r="4" fill={ink} /></>)}
      {c.eyes === "happy" && (<><path d="M35 53 Q40 46 45 53" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M55 53 Q60 46 65 53" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" /></>)}
      {c.eyes === "fire" && (<><path d="M34 47 L46 51" stroke={ink} strokeWidth="3" strokeLinecap="round" /><path d="M66 47 L54 51" stroke={ink} strokeWidth="3" strokeLinecap="round" /><circle cx="41" cy="55" r="3.5" fill={ink} /><circle cx="59" cy="55" r="3.5" fill={ink} /></>)}
      {c.eyes === "cool" && (<><rect x="31" y="47" width="17" height="10" rx="3" fill={ink} /><rect x="52" y="47" width="17" height="10" rx="3" fill={ink} /><path d="M48 51 H52" stroke={ink} strokeWidth="3" /></>)}
      {c.eyes === "wink" && (<><circle cx="40" cy="52" r="4" fill={ink} /><path d="M55 52 H65" stroke={ink} strokeWidth="3" strokeLinecap="round" /></>)}

      {/* Bouche */}
      {c.mouth === "smile" && <path d="M40 66 Q50 74 60 66" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />}
      {c.mouth === "grin" && <path d="M38 64 Q50 80 62 64 Z" fill={ink} />}
      {c.mouth === "o" && <circle cx="50" cy="69" r="5" fill={ink} />}
      {c.mouth === "tongue" && (<><path d="M40 65 Q50 73 60 65" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M47 69 Q50 78 54 69" fill="#e30613" /></>)}
      {c.mouth === "serious" && <path d="M42 68 H58" stroke={ink} strokeWidth="3" strokeLinecap="round" />}

      {/* Accessoire */}
      {c.hat === "headband" && (<><path d="M19 42 Q50 30 81 42 L80 49 Q50 38 20 49 Z" fill="#e30613" stroke={ink} strokeWidth="2" /><path d="M80 44 L92 38 L90 50 Z" fill="#e30613" stroke={ink} strokeWidth="2" /></>)}
      {c.hat === "cap" && (<><path d="M22 40 Q50 8 78 40 Z" fill="#0b3c8c" stroke={ink} strokeWidth="2.5" /><path d="M70 38 Q86 36 94 42 L74 42 Z" fill="#0b3c8c" stroke={ink} strokeWidth="2.5" /><circle cx="50" cy="20" r="3" fill="#ffd400" /></>)}
      {c.hat === "crown" && <path d="M30 30 L36 14 L44 26 L50 10 L56 26 L64 14 L70 30 Z" fill="#ffd400" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />}
      {c.hat === "sweat" && (<><path d="M76 34 Q80 42 76 46 Q72 42 76 34 Z" fill="#7cc8ff" stroke={ink} strokeWidth="1.5" /><path d="M22 60 Q18 66 22 70 Q26 66 22 60 Z" fill="#7cc8ff" stroke={ink} strokeWidth="1.5" /></>)}
    </svg>
  );
}
