import Link from "next/link";
import { Megaphone, Play, RefreshCw, Smartphone } from "lucide-react";
import { loadTournamentStaff } from "../../load";
import { getEvents, getTournamentMatches, entriesById, queue, freeTables } from "@/lib/tournament";
import { autoCallAction, callMatchAction, cancelCall, startMatch } from "@/app/actions/tournoi";
import { GestionNav } from "@/components/tournoi/GestionNav";
import { TMatchCard, matchTitle } from "@/components/tournoi/ui";
import { ScoreForm } from "@/components/tournoi/StaffForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Salle et scores" };

export default async function SallePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await loadTournamentStaff(slug);
  const names = new Map(getEvents(t.id).map((e) => [e.id, e.name]));
  const entries = entriesById(t.id);
  const onTables = new Map(getTournamentMatches(t.id, "m.status IN ('appele','en_cours')").map((m) => [m.table_no, m]));
  const waiting = queue(t);
  const free = freeTables(t);
  const playable = waiting.filter((w) => !w.blocked).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <GestionNav slug={t.slug} active="/salle" />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form action={autoCallAction}>
          <input type="hidden" name="id" value={t.id} />
          <button className="btn btn-red" disabled={!free.length || !playable}><Megaphone className="h-4 w-4" />Remplir les tables libres</button>
        </form>
        <span className="text-sm text-slate-400">{free.length} table(s) libre(s) · {playable} match(s) jouable(s) · {waiting.length - playable} en attente d&apos;un joueur occupé</span>
        <Link href={`/tournoi/${t.slug}/gestion/salle`} className="ml-auto flex items-center gap-1 text-sm text-slate-400 hover:text-club-yellow"><RefreshCw className="h-4 w-4" />Actualiser</Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="grid content-start gap-3 md:grid-cols-2">
          {Array.from({ length: t.tables_count }, (_, i) => i + 1).map((n) => {
            const m = onTables.get(n);
            if (!m) return <div key={n} className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-500"><b className="text-slate-300">Table {n}</b> · libre</div>;
            const a = entries.get(m.entry_a!), b = entries.get(m.entry_b!);
            return (
              <div key={n} className="card-surface space-y-3 p-3">
                <TMatchCard m={m} entries={entries} title={matchTitle(m, names)} />
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {m.status === "appele" && (
                    <form action={startMatch}><input type="hidden" name="id" value={m.id} /><button className="flex items-center gap-1 font-bold text-emerald-300 hover:underline"><Play className="h-3 w-3" />Commencer</button></form>
                  )}
                  <Link href={`/tournoi/${t.slug}/arbitre/${m.id}`} className="flex items-center gap-1 font-bold text-sky-300 hover:underline"><Smartphone className="h-3 w-3" />Score point par point</Link>
                  <form action={cancelCall} className="ml-auto"><input type="hidden" name="id" value={m.id} /><button className="text-slate-500 hover:text-club-red">Libérer la table</button></form>
                </div>
                <ScoreForm matchId={m.id} nameA={a?.name ?? "A"} nameB={b?.name ?? "B"} />
              </div>
            );
          })}
        </section>

        <section>
          <p className="mb-3 font-display text-2xl uppercase">File d&apos;attente</p>
          <p className="mb-3 text-xs text-slate-400">Ordre : matchs prêts depuis le plus longtemps, en laissant souffler 3 minutes les joueurs qui sortent de table.</p>
          <div className="space-y-2">
            {waiting.map(({ m, blocked, tired }) => (
              <div key={m.id} className={blocked ? "opacity-50" : ""}>
                <TMatchCard m={m} entries={entries} title={matchTitle(m, names)} />
                <div className="mt-1 flex items-center gap-2 text-xs">
                  {blocked ? <span className="text-amber-300">Un joueur est déjà sur une table</span> : tired ? <span className="text-sky-300">Vient de jouer</span> : null}
                  {!blocked && free.length > 0 && (
                    <form action={callMatchAction} className="ml-auto flex items-center gap-1">
                      <input type="hidden" name="id" value={m.id} />
                      <select name="table" className="rounded bg-white/10 px-1 py-0.5" aria-label="Table">
                        {free.map((n) => <option key={n} value={n} className="bg-club-navy">T{n}</option>)}
                      </select>
                      <button className="font-bold text-club-yellow hover:underline">Appeler</button>
                    </form>
                  )}
                </div>
              </div>
            ))}
            {waiting.length === 0 && <p className="text-sm text-slate-400">Aucun match prêt. Faites le tirage d&apos;un tableau pour commencer.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
