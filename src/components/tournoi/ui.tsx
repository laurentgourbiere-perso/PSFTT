import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import {
  isSetDone, setsWon, roundLabel, rankLabel, groupLetter, EVENT_STATUS,
  type Entry, type TMatch, type TEvent, type eventView,
} from "@/lib/tournament";

type Entries = Map<number, Entry>;

export function StatusPill({ status }: { status: TEvent["status"] }) {
  const color = status === "termine" ? "bg-slate-500/30 text-slate-200" : status === "inscriptions" ? "bg-sky-500/20 text-sky-200" : "bg-club-red text-white";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${color}`}>{EVENT_STATUS[status]}</span>;
}

export function LiveDot() {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-club-red opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-club-red" />
    </span>
  );
}

/** Une ligne de match : deux joueurs, manches, vainqueur en jaune. */
export function TMatchCard({ m, entries, title, href, big }: { m: TMatch; entries: Entries; title?: string; href?: string; big?: boolean }) {
  const [wa, wb] = setsWon(m);
  const live = m.status === "en_cours";
  const side = (entryId: number | null, won: number, hcp: number, idx: 0 | 1) => {
    const e = entryId ? entries.get(entryId) : undefined;
    const winner = m.winner != null && m.winner === entryId;
    return (
      <div className={`flex items-center gap-2 ${m.winner != null && !winner ? "opacity-50" : ""}`}>
        <span className={`min-w-0 flex-1 truncate ${big ? "text-xl" : "text-sm"} ${winner ? "font-black text-club-yellow" : "font-semibold"}`}>
          {e ? e.name : <span className="italic text-slate-500">{m.stage === "ko" && m.status === "termine" ? "exempt" : "à venir"}</span>}
          {e && !big && <span className="ml-1 text-[10px] font-normal text-slate-400">{e.points} pts</span>}
          {hcp > 0 && <span className="ml-1 rounded bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-200">+{hcp}</span>}
        </span>
        {m.sets.map((s, i) => (
          <span key={i} className={`w-6 text-center tabular-nums ${big ? "text-lg" : "text-xs"} ${isSetDone(s[0], s[1]) ? (s[idx] > s[1 - idx] ? "font-bold" : "text-slate-400") : "font-black text-club-yellow"}`}>
            {s[idx]}
          </span>
        ))}
        {(m.status === "termine" || live) && m.outcome !== "exempt" && (
          <span className={`w-7 rounded text-center font-display tabular-nums ${big ? "text-2xl" : "text-base"} ${winner ? "bg-club-yellow text-club-navy" : "bg-white/10"}`}>
            {m.outcome === "forfait" ? (winner ? "V" : "F") : won}
          </span>
        )}
      </div>
    );
  };
  const body = (
    <div className={`rounded-xl border p-2.5 ${live ? "border-club-red/60 bg-club-red/10" : m.status === "appele" ? "border-club-yellow/50 bg-club-yellow/5" : "border-white/10 bg-white/5"}`}>
      {(title || m.table_no || live) && (
        <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {live && <LiveDot />}
          {m.table_no && m.status !== "termine" && <span className="rounded bg-white/10 px-1.5 text-white">Table {m.table_no}</span>}
          {m.status === "appele" && <span className="text-club-yellow">Appelé</span>}
          {title && <span className="truncate">{title}</span>}
        </div>
      )}
      <div className="space-y-1">
        {side(m.entry_a, wa, m.handicap_a, 0)}
        {side(m.entry_b, wb, m.handicap_b, 1)}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block hover:brightness-125">{body}</Link> : body;
}

export function GroupCard({ g, entries, letter }: { g: ReturnType<typeof eventView>["groups"][number]; entries: Entries; letter?: boolean }) {
  return (
    <div className="card-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-xl uppercase">Poule {letter === false ? g.no : groupLetter(g.no)}</p>
        {g.done && <span className="text-xs font-bold text-emerald-300">✓ terminée</span>}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-[10px] uppercase text-slate-400">
          <tr><th className="w-6">#</th><th>Joueur</th><th className="text-center">V</th><th className="text-center">D</th><th className="text-center">Manches</th><th className="text-right">Pts</th></tr>
        </thead>
        <tbody>
          {g.standings.map((s) => (
            <tr key={s.entry.id} className="border-t border-white/5">
              <td className="py-1 font-bold text-club-yellow">{s.played ? s.rank : "–"}</td>
              <td className="truncate py-1 font-semibold">{s.entry.name}<span className="ml-1 text-[10px] text-slate-400">{s.entry.club}</span></td>
              <td className="text-center tabular-nums">{s.won}</td>
              <td className="text-center tabular-nums">{s.lost}</td>
              <td className="text-center tabular-nums text-slate-400">{s.setsFor}-{s.setsAgainst}</td>
              <td className="text-right font-bold tabular-nums">{s.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1.5">
        {g.matches.map((m) => <TMatchCard key={m.id} m={m} entries={entries} />)}
      </div>
    </div>
  );
}

export function Bracket({ rounds, entries }: { rounds: ReturnType<typeof eventView>["rounds"]; entries: Entries }) {
  if (!rounds.length) return null;
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {rounds.map((r) => (
          <div key={r.round} className="flex w-60 flex-col">
            <p className="mb-2 text-center text-xs font-black uppercase tracking-widest text-club-yellow">{roundLabel(r.round)}</p>
            <div className="flex flex-1 flex-col justify-around gap-2">
              {r.matches.map((m) => <TMatchCard key={m.id} m={m} entries={entries} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Podium({ podium }: { podium: Entry[] }) {
  if (!podium.length) return null;
  return (
    <ul className="space-y-2">
      {podium.map((e) => (
        <li key={e.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${e.final_rank === 1 ? "bg-club-yellow text-club-navy" : "bg-white/5"}`}>
          {e.final_rank === 1 ? <Trophy className="h-5 w-5" /> : <Medal className={`h-5 w-5 ${e.final_rank === 2 ? "text-slate-300" : "text-amber-600"}`} />}
          <span className="flex-1 font-bold">{e.name}<span className="ml-2 text-xs font-normal opacity-70">{e.club}</span></span>
          <span className="text-xs font-black uppercase">{rankLabel(e.final_rank)}</span>
        </li>
      ))}
    </ul>
  );
}

export function EventPanel({ ev, view, entries }: { ev: TEvent; view: ReturnType<typeof eventView>; entries: Entries }) {
  return (
    <div className="space-y-8">
      {view.podium.length > 0 && (
        <section className="max-w-xl">
          <p className="mb-2 font-display text-2xl uppercase">Podium</p>
          <Podium podium={view.podium} />
        </section>
      )}
      {view.rounds.length > 0 && (
        <section>
          <p className="mb-2 font-display text-2xl uppercase">Tableau final</p>
          <Bracket rounds={view.rounds} entries={entries} />
        </section>
      )}
      {view.groups.length > 0 && (
        <section>
          <p className="mb-2 font-display text-2xl uppercase">Poules <span className="text-base text-slate-400">· {ev.qualifiers} sortant{ev.qualifiers > 1 ? "s" : ""} par poule</span></p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {view.groups.map((g) => <GroupCard key={g.no} g={g} entries={entries} />)}
          </div>
        </section>
      )}
      {ev.status === "inscriptions" && (
        <p className="text-slate-400">Le tirage au sort n&apos;a pas encore eu lieu. {view.entries.filter((e) => e.status === "inscrit").length} inscrit(s).</p>
      )}
    </div>
  );
}

export function eventRules(ev: TEvent) {
  const r: string[] = [];
  if (ev.is_double) r.push("Double");
  if (ev.handicap) r.push("Handicap : 1 point d'avance par tranche de 100 points d'écart (8 max)");
  if (ev.max_points != null) r.push(`≤ ${ev.max_points} points`);
  if (ev.min_points != null) r.push(`≥ ${ev.min_points} points`);
  if (ev.min_birth_year != null) r.push(`Nés en ${ev.min_birth_year} ou après`);
  r.push(ev.format === "ko" ? "Élimination directe" : `Poules de ${ev.group_size} puis tableau`);
  r.push(`${Math.ceil(ev.best_of / 2)} manches gagnantes`);
  return r;
}

export function matchTitle(m: TMatch, events: Map<number, string>) {
  return `${events.get(m.event_id)} · ${m.stage === "poule" ? `Poule ${groupLetter(m.group_no!)}` : roundLabel(m.round)}`;
}
