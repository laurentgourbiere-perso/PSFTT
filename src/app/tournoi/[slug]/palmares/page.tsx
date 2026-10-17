import { Gift, Ticket } from "lucide-react";
import { loadTournament } from "../load";
import { getEvents, eventView, getPrizes, entriesById, rankLabel, eur } from "@/lib/tournament";
import { Podium, StatusPill } from "@/components/tournoi/ui";
import { SectionTitle } from "@/components/SectionTitle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Palmarès" };

export default async function PalmaresPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await loadTournament(slug);
  const events = getEvents(t.id);
  const prizes = getPrizes(t.id);
  const entries = entriesById(t.id);
  const raffle = prizes.filter((p) => p.event_id == null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionTitle kicker="Les vainqueurs et leurs lots" title="Palmarès" />
      <div className="grid gap-5 md:grid-cols-2">
        {events.map((e) => {
          const podium = eventView(e).podium;
          const lots = prizes.filter((p) => p.event_id === e.id);
          return (
            <section key={e.id} className="card-surface p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-display text-2xl uppercase">{e.name}</p>
                <StatusPill status={e.status} />
              </div>
              {podium.length ? <Podium podium={podium} /> : <p className="text-sm text-slate-400">Tableau pas encore terminé.</p>}
              {lots.length > 0 && (
                <ul className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
                  {lots.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <Gift className="h-4 w-4 shrink-0 text-club-yellow" />
                      <span className="w-28 shrink-0 text-xs font-bold uppercase text-slate-400">{rankLabel(p.rank)}</span>
                      <span className="flex-1">{p.label}{p.sponsor && <span className="text-xs text-slate-400"> · offert par {p.sponsor}</span>}</span>
                      {p.winner_entry && <span className="text-xs font-semibold text-club-yellow">{entries.get(p.winner_entry)?.name}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {raffle.length > 0 && (
        <section className="mt-10">
          <SectionTitle kicker="Parmi tous les joueurs présents" title="Tombola" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {raffle.map((p) => (
              <div key={p.id} className={`card-surface flex items-center gap-3 p-4 ${p.raffle_name ? "border-club-yellow/50" : ""}`}>
                <Ticket className="h-6 w-6 shrink-0 text-club-yellow" />
                <div className="min-w-0">
                  <p className="font-bold">{p.label}{p.value ? <span className="ml-1 text-xs font-normal text-slate-400">({eur(p.value)})</span> : null}</p>
                  <p className="text-sm text-slate-400">{p.raffle_name ? <>Gagné par <span className="font-bold text-club-yellow">{p.raffle_name}</span></> : "Tirage à venir"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
