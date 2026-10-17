import Link from "next/link";
import { Monitor } from "lucide-react";
import { loadTournament } from "../load";
import { getEvents, getEvent, getTournamentMatches, entriesById, eventView, queue } from "@/lib/tournament";
import { AutoRefresh } from "@/components/tournoi/AutoRefresh";
import { TMatchCard, EventPanel, StatusPill, LiveDot, matchTitle } from "@/components/tournoi/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "En direct" };

export default async function DirectPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tableau?: string }> }) {
  const { slug } = await params;
  const { tableau } = await searchParams;
  const { t, scorer } = await loadTournament(slug);
  const events = getEvents(t.id);
  const names = new Map(events.map((e) => [e.id, e.name]));
  const entries = entriesById(t.id);
  const onTables = getTournamentMatches(t.id, "m.status IN ('appele','en_cours')");
  const byTable = new Map(onTables.map((m) => [m.table_no, m]));
  const next = queue(t).filter((q) => !q.blocked).slice(0, 6);
  const results = getTournamentMatches(t.id, "m.status = 'termine' AND m.outcome != 'exempt' ORDER BY m.finished_at DESC LIMIT 8");
  const selected = getEvent(Number(tableau)) ?? events.find((e) => e.status === "poules" || e.status === "tableau") ?? events[0];
  const base = `/tournoi/${t.slug}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {t.status === "en_cours" && <span className="flex items-center gap-2 rounded-full bg-club-red px-3 py-1 text-xs font-black uppercase"><LiveDot /> Direct</span>}
        <AutoRefresh seconds={5} />
        <Link href={`${base}/ecran`} className="ml-auto flex items-center gap-1 text-xs font-bold uppercase text-slate-400 hover:text-club-yellow"><Monitor className="h-4 w-4" />Mode écran géant</Link>
      </div>

      {t.status !== "termine" && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="min-w-0">
            <p className="mb-3 font-display text-2xl uppercase">Sur les tables</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: t.tables_count }, (_, i) => i + 1).map((n) => {
                const m = byTable.get(n);
                return m ? (
                  <TMatchCard key={n} m={m} entries={entries} title={matchTitle(m, names)} href={scorer ? `${base}/arbitre/${m.id}` : undefined} />
                ) : (
                  <div key={n} className="flex items-center gap-2 rounded-xl border border-dashed border-white/10 p-3 text-xs uppercase text-slate-500"><span className="rounded bg-white/5 px-1.5">Table {n}</span> libre</div>
                );
              })}
            </div>
            {scorer && onTables.length > 0 && <p className="mt-2 text-xs text-slate-500">Bénévoles : touchez un match pour tenir le score point par point.</p>}
          </section>
          <section className="min-w-0 space-y-6">
            <div>
              <p className="mb-3 font-display text-2xl uppercase">Prochains matchs</p>
              <div className="space-y-2">
                {next.map(({ m }) => <TMatchCard key={m.id} m={m} entries={entries} title={matchTitle(m, names)} />)}
                {next.length === 0 && <p className="text-sm text-slate-400">Aucun match en attente.</p>}
              </div>
            </div>
            <div>
              <p className="mb-3 font-display text-2xl uppercase">Derniers résultats</p>
              <div className="space-y-2">
                {results.map((m) => <TMatchCard key={m.id} m={m} entries={entries} title={matchTitle(m, names)} />)}
                {results.length === 0 && <p className="text-sm text-slate-400">Pas encore de résultat.</p>}
              </div>
            </div>
          </section>
        </div>
      )}

      {selected && (
        <section className="mt-10">
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {events.map((e) => (
              <Link key={e.id} href={`?tableau=${e.id}`} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${e.id === selected.id ? "bg-club-yellow text-club-navy" : "bg-white/10 hover:bg-white/20"}`}>
                {e.name} <StatusPill status={e.status} />
              </Link>
            ))}
          </div>
          <EventPanel ev={selected} view={eventView(selected)} entries={entries} />
        </section>
      )}
    </div>
  );
}
