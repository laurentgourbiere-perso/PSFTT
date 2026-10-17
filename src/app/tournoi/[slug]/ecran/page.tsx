import Link from "next/link";
import { X } from "lucide-react";
import { loadTournament } from "../load";
import { getEvents, getTournamentMatches, entriesById, eventView } from "@/lib/tournament";
import { AutoRefresh } from "@/components/tournoi/AutoRefresh";
import { TMatchCard, LiveDot, Podium, matchTitle } from "@/components/tournoi/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Écran de la salle" };

/** Affichage plein écran pour la télé ou le vidéoprojecteur de la salle. */
export default async function EcranPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await loadTournament(slug);
  const events = getEvents(t.id);
  const names = new Map(events.map((e) => [e.id, e.name]));
  const entries = entriesById(t.id);
  const onTables = getTournamentMatches(t.id, "m.status IN ('appele','en_cours') ORDER BY m.table_no");
  const calls = onTables.filter((m) => m.status === "appele");
  const playing = onTables.filter((m) => m.status === "en_cours");
  const results = getTournamentMatches(t.id, "m.status = 'termine' AND m.outcome != 'exempt' ORDER BY m.finished_at DESC LIMIT 6");
  const podiums = events.map((e) => ({ e, podium: eventView(e).podium })).filter((p) => p.podium.some((x) => x.final_rank === 1));

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-club-navy p-6 hero-bg">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="font-display text-4xl uppercase">{t.name}</h1>
        {t.status === "en_cours" && <span className="flex items-center gap-2 rounded-full bg-club-red px-3 py-1 text-sm font-black uppercase"><LiveDot /> Direct</span>}
        <span className="ml-auto"><AutoRefresh seconds={4} /></span>
        <Link href={`/tournoi/${t.slug}/direct`} aria-label="Quitter l'écran géant" className="rounded-full p-2 text-slate-500 hover:bg-white/10"><X /></Link>
      </div>

      {calls.length > 0 && (
        <section className="mb-6 rounded-3xl bg-club-yellow p-5 text-club-navy">
          <p className="font-display text-2xl uppercase">📣 Appel des joueurs</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {calls.map((m) => (
              <div key={m.id} className="flex items-center gap-4 rounded-2xl bg-white/60 p-3">
                <span className="font-display text-5xl leading-none">T{m.table_no}</span>
                <span className="min-w-0 text-lg font-black leading-tight">
                  {entries.get(m.entry_a!)?.name}<br /><span className="text-sm font-bold opacity-60">contre</span> {entries.get(m.entry_b!)?.name}
                  <span className="block truncate text-xs font-semibold uppercase opacity-60">{matchTitle(m, names)}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section>
          <p className="mb-3 font-display text-3xl uppercase">En jeu</p>
          <div className="grid gap-3 md:grid-cols-2">
            {playing.map((m) => <TMatchCard key={m.id} m={m} entries={entries} title={matchTitle(m, names)} big />)}
            {playing.length === 0 && <p className="text-xl text-slate-400">Aucun match en cours.</p>}
          </div>
        </section>
        <section className="space-y-6">
          {podiums.length > 0 && (
            <div>
              <p className="mb-3 font-display text-3xl uppercase">🏆 Vainqueurs</p>
              <div className="space-y-4">
                {podiums.map(({ e, podium }) => (
                  <div key={e.id}><p className="mb-1 font-bold uppercase text-club-yellow">{e.name}</p><Podium podium={podium.filter((x) => x.final_rank === 1)} /></div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-3 font-display text-3xl uppercase">Résultats</p>
            <div className="space-y-2">{results.map((m) => <TMatchCard key={m.id} m={m} entries={entries} title={matchTitle(m, names)} />)}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
