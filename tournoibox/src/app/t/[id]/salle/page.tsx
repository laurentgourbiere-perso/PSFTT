import Link from "next/link";
import { Coffee, Hourglass, Play, RefreshCw } from "lucide-react";
import { getTournament, getEvents } from "@/lib/tournament";
import { sportOf } from "@/lib/sports";
import { entriesById, tournamentMatches, queue, freeCourts, groupLetter, roundLabel, REST_MINUTES, type Match } from "@/lib/engine";
import { startAction, releaseAction } from "@/app/actions-competition";
import { MatchCard } from "@/components/MatchCard";
import { toVM } from "@/components/Competition";
import { AutoCallForm, CallForm } from "@/components/CourtForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Salle" };

const minutesSince = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000)) : 0);

export default async function SallePage({ params }: { params: Promise<{ id: string }> }) {
  const t = getTournament(Number((await params).id))!;
  const sport = sportOf(t.sport);
  const names = new Map(getEvents(t.id).map((e) => [e.id, e.name]));
  const title = (m: Match) => `${names.get(m.event_id)} · ${m.stage === "poule" ? `Poule ${groupLetter(m.group_no!)}` : roundLabel(m.round)}`;
  const entries = entriesById(t.id);
  const onCourts = new Map(tournamentMatches(t.id, "m.status IN ('appele','en_cours')").map((m) => [m.court_no, m]));
  const waiting = queue(t.id);
  const free = freeCourts(t.id);
  const playable = waiting.filter((w) => !w.blocked).length;
  const recent = tournamentMatches(t.id, "m.status = 'termine' AND m.outcome != 'exempt' ORDER BY m.finished_at DESC LIMIT 6");
  const court = t.court_label;

  if (!waiting.length && !onCourts.size && !recent.length) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-display text-3xl font-bold">La salle est vide</p>
        <p className="mt-2 text-muted">Faites le tirage d&apos;un tableau dans l&apos;onglet <Link href={`/t/${t.id}/competition`} className="text-brand-2 underline">Compétition</Link> : ses matchs arriveront ici, prêts à être appelés.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <AutoCallForm tournamentId={t.id} disabled={!free.length || !playable} label={`Remplir les ${court.toLowerCase()}s libres`} />
        <p className="text-sm text-muted">
          <b className="text-white">{free.length}</b> {court.toLowerCase()}(s) libre(s) · <b className="text-white">{playable}</b> match(s) jouable(s)
          {waiting.length - playable > 0 && <> · {waiting.length - playable} en attente d&apos;un joueur occupé</>}
        </p>
        <Link href={`/t/${t.id}/salle`} className="ml-auto flex items-center gap-1 text-sm text-muted hover:text-white"><RefreshCw className="h-4 w-4" />Actualiser</Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="grid content-start gap-3 md:grid-cols-2">
          {Array.from({ length: t.courts_count }, (_, i) => i + 1).map((n) => {
            const m = onCourts.get(n);
            if (!m) {
              return (
                <div key={n} className="flex items-center gap-3 rounded-lg border border-dashed border-line p-4 text-sm text-muted">
                  <span className="font-display text-2xl font-bold text-white/70">{n}</span>{court} libre
                </div>
              );
            }
            const live = m.status === "en_cours";
            return (
              <div key={n} className={`panel space-y-2 p-3 ${live ? "!border-lime/50" : "!border-amber/50"}`}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-display text-2xl font-bold">{n}</span>
                  <span className={`chip ${live ? "bg-lime/15 text-lime" : "bg-amber/20 text-amber"}`}>{live ? "En jeu" : "Appelé"}</span>
                  <span className="flex items-center gap-1 text-muted"><Hourglass className="h-3 w-3" />{minutesSince(live ? m.started_at : m.called_at)} min</span>
                  {!live && (
                    <form action={startAction} className="ml-auto"><input type="hidden" name="id" value={m.id} />
                      <button className="flex items-center gap-1 font-semibold text-lime hover:underline"><Play className="h-3 w-3" />Commencer</button>
                    </form>
                  )}
                  <form action={releaseAction} className={live ? "ml-auto" : ""}><input type="hidden" name="id" value={m.id} />
                    <button className="text-muted hover:text-hot" title="Remettre le match dans la file d'attente">Libérer</button>
                  </form>
                </div>
                <MatchCard m={toVM(m, entries, { title: title(m) })} editable placeholder={sport.example} />
              </div>
            );
          })}
        </section>

        <aside className="space-y-6">
          <section>
            <p className="mb-1 font-display text-2xl font-bold">File d&apos;attente</p>
            <p className="mb-3 text-xs text-muted">Les matchs prêts depuis le plus longtemps d&apos;abord. Un joueur qui sort de {court.toLowerCase()} souffle {REST_MINUTES} minutes si d&apos;autres matchs peuvent passer avant.</p>
            <div className="space-y-2">
              {waiting.slice(0, 30).map(({ m, blocked, resting }) => (
                <div key={m.id} className={blocked ? "opacity-50" : ""}>
                  <MatchCard m={toVM(m, entries, { title: title(m) })} />
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {blocked ? <span className="text-amber">Un joueur est déjà sur un{court === "Table" ? "e" : ""} {court.toLowerCase()}</span>
                      : resting ? <span className="flex items-center gap-1 text-sky-300"><Coffee className="h-3 w-3" />vient de jouer</span> : null}
                    {!blocked && free.length > 0 && <span className="ml-auto"><CallForm matchId={m.id} courts={free} courtLabel={court} /></span>}
                  </div>
                </div>
              ))}
              {waiting.length > 30 && <p className="text-xs text-muted">… et {waiting.length - 30} autres matchs</p>}
              {waiting.length === 0 && <p className="text-sm text-muted">Aucun match en attente.</p>}
            </div>
          </section>
          {recent.length > 0 && (
            <section>
              <p className="mb-3 font-display text-2xl font-bold">Derniers résultats</p>
              <div className="space-y-2">{recent.map((m) => <MatchCard key={m.id} m={toVM(m, entries, { title: title(m) })} editable />)}</div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
