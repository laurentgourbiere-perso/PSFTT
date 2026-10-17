import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { loadTournament } from "./load";
import { TOURNAMENT_STATUS } from "@/lib/tournament";
import { LiveDot } from "@/components/tournoi/ui";

export default async function TournoiLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, staff } = await loadTournament(slug);
  const base = `/tournoi/${t.slug}`;
  const links = [
    { href: base, label: "Infos" },
    ...(t.status === "inscriptions" ? [{ href: `${base}/inscription`, label: "S'inscrire" }] : []),
    { href: `${base}/direct`, label: "En direct" },
    { href: `${base}/palmares`, label: "Palmarès" },
    ...(staff ? [{ href: `${base}/gestion`, label: "Gestion" }] : []),
  ];
  return (
    <div>
      <div className="hero-bg border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-8">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-club-yellow">
            {t.status === "en_cours" && <LiveDot />} {TOURNAMENT_STATUS[t.status]}
          </p>
          <h1 className="font-display text-4xl uppercase leading-none sm:text-6xl">{t.name}</h1>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
            <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{new Date(t.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{t.start_time && ` · ${t.start_time.replace(":", "h")}`}</span>
            {t.venue && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{t.venue}</span>}
          </p>
          <nav className="mt-5 flex gap-1 overflow-x-auto">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide hover:bg-club-yellow hover:text-club-navy">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
