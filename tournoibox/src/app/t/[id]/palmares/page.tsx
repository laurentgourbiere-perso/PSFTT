import { Gift, Medal, Ticket, Trophy } from "lucide-react";
import { getTournament, getEvents, playerCount } from "@/lib/tournament";
import { sportOf } from "@/lib/sports";
import { eventView, entriesById, rankLabel } from "@/lib/engine";
import { getPrizes } from "@/lib/prizes";
import { PrintButton } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Palmarès" };

/** Palmarès du tournoi : podiums, classement final, lots et tombola. Prévu pour l'impression ou l'affichage. */
export default async function PalmaresPage({ params }: { params: Promise<{ id: string }> }) {
  const t = getTournament(Number((await params).id))!;
  const sport = sportOf(t.sport);
  const events = getEvents(t.id);
  const prizes = getPrizes(t.id);
  const entries = entriesById(t.id);
  const raffle = prizes.filter((p) => p.event_id == null && p.raffle_name);
  const date = new Date(t.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-brand-2">{sport.emoji} Palmarès</p>
          <h1 className="font-display text-5xl font-bold">{t.name}</h1>
          <p className="text-muted">{date}{t.venue ? ` · ${t.venue}` : ""} · {playerCount(t.id)} joueurs</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid gap-5 md:grid-cols-2 print:grid-cols-2">
        {events.map((ev) => {
          const view = eventView(ev);
          const ranked = view.entries.filter((e) => e.final_rank != null).sort((a, b) => a.final_rank! - b.final_rank!);
          const lots = prizes.filter((p) => p.event_id === ev.id);
          return (
            <section key={ev.id} className="panel p-5">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <p className="font-display text-2xl font-bold">{ev.name}</p>
                <span className="text-xs text-muted">{view.entries.filter((e) => e.status === "inscrit").length} {ev.is_double ? "paires" : "joueurs"}</span>
              </div>
              {ranked.length ? (
                <ol className="space-y-1.5">
                  {ranked.slice(0, 8).map((e) => (
                    <li key={e.id} className="flex items-center gap-2">
                      {e.final_rank === 1 ? <Trophy className="h-5 w-5 text-lime" /> : e.final_rank! <= 3 ? <Medal className={`h-5 w-5 ${e.final_rank === 2 ? "text-slate-300" : "text-amber"}`} /> : <span className="w-5 text-center text-sm text-muted">{e.final_rank}</span>}
                      <span className={`flex-1 ${e.final_rank === 1 ? "font-bold" : "font-medium"}`}>{e.name}<span className="ml-2 text-xs text-muted">{e.club}</span></span>
                      <span className="text-xs uppercase text-muted">{rankLabel(e.final_rank)}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-muted">{ev.status === "inscriptions" ? "Pas encore joué." : "En cours…"}</p>}
              {lots.some((p) => p.winner_entry) && (
                <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
                  {lots.filter((p) => p.winner_entry).map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <Gift className="h-4 w-4 shrink-0 text-brand-2" />
                      <span className="flex-1">{p.label}{p.sponsor && <span className="text-xs text-muted"> · offert par {p.sponsor}</span>}</span>
                      <span className="text-xs font-semibold">{entries.get(p.winner_entry!)?.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {raffle.length > 0 && (
        <section className="panel mt-5 p-5">
          <p className="mb-3 flex items-center gap-2 font-display text-2xl font-bold"><Ticket className="h-5 w-5 text-brand-2" />Tombola</p>
          <ul className="grid gap-2 sm:grid-cols-2 print:grid-cols-2">
            {raffle.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{p.label}{p.sponsor && <span className="text-xs text-muted"> · {p.sponsor}</span>}</span>
                <span className="font-semibold">{p.raffle_name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-6 text-center text-xs text-muted">Édité avec TournoiBox</p>
    </main>
  );
}
