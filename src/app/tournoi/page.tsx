import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { TOURNAMENT_STATUS, type Tournament } from "@/lib/tournament";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata = { title: "Tournois" };
export const dynamic = "force-dynamic";

export default async function TournoisPage() {
  const user = await getCurrentUser();
  const staff = can.runTournament(user?.role);
  const list = db.prepare(`SELECT * FROM tournaments ${staff ? "" : "WHERE status != 'brouillon'"} ORDER BY date DESC`).all() as Tournament[];
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <SectionTitle kicker="Organisé par le club" title="Tournois" />
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((t) => (
          <Link key={t.id} href={`/tournoi/${t.slug}`} className={`card-surface block p-6 transition hover:-translate-y-1 hover:border-club-yellow ${t.status === "termine" ? "opacity-80" : ""}`}>
            <p className={`text-xs font-black uppercase tracking-widest ${t.status === "en_cours" ? "text-club-red" : t.status === "inscriptions" ? "text-club-yellow" : "text-slate-400"}`}>{TOURNAMENT_STATUS[t.status]}</p>
            <p className="font-display text-3xl uppercase">{t.name}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 text-sm text-slate-300">
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{new Date(t.date).toLocaleDateString("fr-FR", { dateStyle: "long" })}</span>
              {t.venue && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{t.venue}</span>}
            </p>
          </Link>
        ))}
        {list.length === 0 && <p className="text-slate-400">Aucun tournoi pour le moment.</p>}
      </div>
    </div>
  );
}
