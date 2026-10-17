import Link from "next/link";
import { loadTournamentStaff } from "../../load";
import { db } from "@/lib/db";
import { getEvents, getEvent, eventView, entriesById, groupLetter } from "@/lib/tournament";
import { GestionNav } from "@/components/tournoi/GestionNav";
import { EventPanel, StatusPill, eventRules } from "@/components/tournoi/ui";
import { DrawForm } from "@/components/tournoi/StaffForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tableaux et tirage" };

export default async function TableauxPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string }> }) {
  const { slug } = await params;
  const { t: tab } = await searchParams;
  const { t } = await loadTournamentStaff(slug);
  const events = getEvents(t.id);
  const found = getEvent(Number(tab));
  const ev = found && found.tournament_id === t.id ? found : events[0];
  if (!ev) return <div className="mx-auto max-w-7xl px-4 py-8"><GestionNav slug={t.slug} active="/tableaux" /><p>Aucun tableau : créez-en dans les réglages.</p></div>;

  const view = eventView(ev);
  const entries = entriesById(t.id);
  const active = view.entries.filter((e) => e.status !== "attente");
  const absents = active.filter((e) => !e.present).length;
  const played = (db.prepare("SELECT COUNT(*) n FROM tournament_matches WHERE event_id = ? AND status IN ('en_cours','termine') AND IFNULL(outcome, '') != 'exempt'").get(ev.id) as { n: number }).n;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <GestionNav slug={t.slug} active="/tableaux" />
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {events.map((e) => (
          <Link key={e.id} href={`?t=${e.id}`} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${e.id === ev.id ? "bg-club-yellow text-club-navy" : "bg-white/10 hover:bg-white/20"}`}>
            {e.name} <StatusPill status={e.status} />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2.2fr]">
        <aside className="space-y-4">
          <div className="card-surface p-5">
            <p className="font-display text-2xl uppercase">{ev.name}</p>
            <p className="text-xs text-slate-400">{eventRules(ev).join(" · ")}</p>
            <div className="mt-4">
              {played === 0 ? (
                <DrawForm eventId={ev.id} redo={ev.status !== "inscriptions"} absents={absents} />
              ) : (
                <p className="text-sm text-slate-400">Tirage verrouillé : {played} match(s) déjà joué(s).</p>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Tirage : classement par points, têtes de série réparties en serpentin, puis chaque chapeau tiré au sort en séparant les joueurs d&apos;un même club. Au tableau final, deux sortants d&apos;une même poule sont placés dans des moitiés opposées.
            </p>
          </div>
          <div className="card-surface p-5">
            <p className="mb-2 font-bold">{active.length} engagé(s) · {absents} non pointé(s)</p>
            <ol className="space-y-1 text-sm">
              {view.entries.map((e) => (
                <li key={e.id} className={`flex items-center gap-2 ${e.status !== "inscrit" ? "text-slate-500" : ""}`}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${e.present ? "bg-emerald-400" : "bg-slate-600"}`} title={e.present ? "Pointé" : "Non pointé"} />
                  <span className="w-6 text-xs text-slate-500">{e.seed ?? ""}</span>
                  <span className="flex-1 truncate">{e.name}</span>
                  <span className="text-xs text-slate-400">{e.points}</span>
                  {e.group_no && <span className="rounded bg-white/10 px-1.5 text-xs font-bold">{groupLetter(e.group_no)}</span>}
                  {e.status !== "inscrit" && <span className="text-[10px] uppercase">{e.status}</span>}
                </li>
              ))}
            </ol>
          </div>
        </aside>
        <div className="min-w-0"><EventPanel ev={ev} view={view} entries={entries} /></div>
      </div>
    </div>
  );
}
