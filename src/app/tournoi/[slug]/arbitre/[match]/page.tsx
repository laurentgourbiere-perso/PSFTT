import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Undo2 } from "lucide-react";
import { loadTournament } from "../../load";
import { getMatch, getEvent, entriesById, setsWon, isSetDone, roundLabel, groupLetter } from "@/lib/tournament";
import { scorePoint } from "@/app/actions/tournoi";

export const dynamic = "force-dynamic";
export const metadata = { title: "Arbitrage", robots: { index: false } };

/** Feuille de match sur téléphone : le bénévole de la table marque chaque point, le direct se met à jour. */
export default async function ArbitrePage({ params }: { params: Promise<{ slug: string; match: string }> }) {
  const { slug, match } = await params;
  const { t, scorer } = await loadTournament(slug);
  if (!scorer) redirect("/connexion");
  const m = getMatch(Number(match));
  const ev = m && getEvent(m.event_id);
  if (!m || !ev || ev.tournament_id !== t.id || !m.entry_a || !m.entry_b) notFound();
  const entries = entriesById(t.id);
  const a = entries.get(m.entry_a)!, b = entries.get(m.entry_b)!;
  const [wa, wb] = setsWon(m);
  const cur = m.sets.length && !isSetDone(...(m.sets[m.sets.length - 1] as [number, number])) ? m.sets[m.sets.length - 1] : [m.handicap_a, m.handicap_b];
  const finished = m.status === "termine";
  const back = `/tournoi/${t.slug}/direct`;

  const side = (key: "a" | "b", e: typeof a, sets: number, pts: number) => (
    <form action={scorePoint} className="flex-1">
      <input type="hidden" name="id" value={m.id} />
      <input type="hidden" name="side" value={key} />
      <button disabled={finished} className={`flex h-full min-h-64 w-full flex-col items-center justify-center gap-2 rounded-3xl p-4 transition active:scale-95 disabled:opacity-60 ${m.winner === e.id ? "bg-club-yellow text-club-navy" : key === "a" ? "bg-club-blue" : "bg-club-red"}`}>
        <span className="text-center text-lg font-black uppercase leading-tight">{e.name}</span>
        <span className="font-display text-8xl tabular-nums leading-none">{pts}</span>
        <span className="text-sm font-bold uppercase opacity-80">Manches : {sets}</span>
      </button>
    </form>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between text-sm">
        <Link href={back} className="text-slate-400 hover:text-club-yellow">← Direct</Link>
        <span className="font-bold uppercase text-slate-300">
          {m.table_no && `Table ${m.table_no} · `}{ev.name} · {m.stage === "poule" ? `Poule ${groupLetter(m.group_no!)}` : roundLabel(m.round)}
        </span>
      </div>
      {(m.handicap_a > 0 || m.handicap_b > 0) && (
        <p className="mb-3 rounded-xl bg-emerald-500/15 p-2 text-center text-sm text-emerald-200">
          Handicap : {m.handicap_a > 0 ? a.name : b.name} commence chaque manche avec {Math.max(m.handicap_a, m.handicap_b)} point(s) d&apos;avance
        </p>
      )}
      <div className="flex gap-3">
        {side("a", a, wa, cur[0])}
        {side("b", b, wb, cur[1])}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {m.sets.filter(([x, y]) => isSetDone(x, y)).map(([x, y], i) => (
          <span key={i} className="rounded-lg bg-white/10 px-3 py-1 font-bold tabular-nums">{x}-{y}</span>
        ))}
      </div>
      {finished ? (
        <div className="mt-6 text-center">
          <p className="font-display text-3xl uppercase text-club-yellow">Victoire de {entries.get(m.winner!)?.name}</p>
          <Link href={back} className="btn btn-primary mt-4">Retour au direct</Link>
        </div>
      ) : (
        <form action={scorePoint} className="mt-6 text-center">
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="side" value="undo" />
          <button className="btn btn-ghost"><Undo2 className="h-4 w-4" />Annuler le dernier point</button>
        </form>
      )}
      <p className="mt-6 text-center text-xs text-slate-500">Touchez la moitié du joueur qui marque. La manche et le match se clôturent tout seuls ({Math.ceil(ev.best_of / 2)} manches gagnantes).</p>
    </div>
  );
}
