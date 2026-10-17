import Link from "next/link";
import { Clock, Euro, Radio, Trophy, Users } from "lucide-react";
import { loadTournament } from "./load";
import { getEvents, eventFill, eur } from "@/lib/tournament";
import { db } from "@/lib/db";
import { StatusPill, eventRules } from "@/components/tournoi/ui";
import { SectionTitle } from "@/components/SectionTitle";

export const dynamic = "force-dynamic";

export default async function TournoiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await loadTournament(slug);
  const events = getEvents(t.id);
  const players = (db.prepare("SELECT COUNT(*) n FROM tournament_players WHERE tournament_id = ?").get(t.id) as { n: number }).n;
  const prizes = (db.prepare("SELECT COUNT(*) n, IFNULL(SUM(value), 0) v FROM tournament_prizes WHERE tournament_id = ?").get(t.id) as { n: number; v: number });
  const base = `/tournoi/${t.slug}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-8">
          {t.description && <p className="whitespace-pre-line text-lg text-slate-200">{t.description}</p>}
          <section>
            <SectionTitle kicker={`${t.max_events} tableaux maxi + double`} title="Les tableaux" />
            <div className="grid gap-3 sm:grid-cols-2">
              {events.map((e) => {
                const n = eventFill(e.id);
                return (
                  <div key={e.id} className="card-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-2xl uppercase">{e.name}</p>
                      <StatusPill status={e.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{eventRules(e).join(" · ")}</p>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      {e.start_time && <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-club-yellow" />{e.start_time.replace(":", "h")}</span>}
                      <span className="flex items-center gap-1"><Users className="h-4 w-4 text-club-yellow" />{n}{e.capacity ? ` / ${e.capacity}` : ""} {e.is_double ? "paires" : "inscrits"}</span>
                    </div>
                    {e.capacity && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-club-yellow" style={{ width: `${Math.min(100, (n / e.capacity) * 100)}%` }} /></div>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {t.status === "inscriptions" && (
            <Link href={`${base}/inscription`} className="btn btn-primary w-full !py-4 !text-base">Je m&apos;inscris en ligne</Link>
          )}
          {(t.status === "en_cours" || t.status === "termine") && (
            <Link href={`${base}/direct`} className="btn btn-red w-full !py-4 !text-base"><Radio className="h-5 w-5" /> {t.status === "en_cours" ? "Suivre le direct" : "Voir les résultats"}</Link>
          )}
          <div className="card-surface p-5">
            <p className="flex items-center gap-2 font-display text-2xl uppercase"><Euro className="h-5 w-5 text-club-yellow" />Tarifs</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt>1 tableau</dt><dd className="font-bold">{eur(t.price_1)}</dd></div>
              <div className="flex justify-between"><dt>2 tableaux</dt><dd className="font-bold">{eur(t.price_2)}</dd></div>
              <div className="flex justify-between"><dt>Double (par joueur)</dt><dd className="font-bold">{eur(t.price_double)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-slate-400">
              Ouvert à tous, licenciés ou non.{t.checkin_time && ` Inscriptions et pointage sur place à partir de ${t.checkin_time.replace(":", "h")}.`} Paiement en ligne ou sur place.
            </p>
          </div>
          <div className="card-surface grid grid-cols-2 gap-3 p-5 text-center">
            <div><p className="font-display text-4xl text-club-yellow">{players}</p><p className="text-xs uppercase text-slate-400">joueurs inscrits</p></div>
            <div><p className="font-display text-4xl text-club-yellow">{prizes.n}</p><p className="text-xs uppercase text-slate-400">lots à gagner</p></div>
          </div>
          {prizes.n > 0 && (
            <Link href={`${base}/palmares`} className="card-surface flex items-center gap-3 p-4 hover:border-club-yellow">
              <Trophy className="h-6 w-6 text-club-yellow" /><span className="text-sm font-semibold">Lots, tombola et palmarès</span>
            </Link>
          )}
          {t.sponsors && (
            <div className="card-surface p-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Merci à nos partenaires</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {t.sponsors.split("\n").filter(Boolean).map((s) => <li key={s} className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">{s}</li>)}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
