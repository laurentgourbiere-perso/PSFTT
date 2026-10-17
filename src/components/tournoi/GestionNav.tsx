import Link from "next/link";

const TABS = [
  ["", "Tableau de bord"],
  ["/joueurs", "Pointage & paiements"],
  ["/tableaux", "Tableaux & tirage"],
  ["/salle", "Salle & scores"],
  ["/lots", "Lots"],
  ["/reglages", "Réglages"],
] as const;

export function GestionNav({ slug, active }: { slug: string; active: (typeof TABS)[number][0] }) {
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-white/10 pb-2">
      {TABS.map(([path, label]) => (
        <Link
          key={path}
          href={`/tournoi/${slug}/gestion${path}`}
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${active === path ? "bg-club-yellow text-club-navy" : "text-slate-300 hover:bg-white/10"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
