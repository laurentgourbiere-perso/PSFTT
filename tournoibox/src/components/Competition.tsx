import { Medal, Trophy } from "lucide-react";
import { groupLetter, roundLabel, rankLabel, type Entry, type EventView, type Match } from "@/lib/engine";
import { MatchCard, type MatchVM } from "./MatchCard";

type Entries = Map<number, Entry>;

/** Transforme un match en données affichables (côté navigateur, sans accès à la base). */
export function toVM(m: Match, entries: Entries, extra: Partial<MatchVM> = {}): MatchVM {
  const side = (id: number | null) => {
    const e = id ? entries.get(id) : undefined;
    return e ? { name: e.name, club: e.club, points: e.points } : null;
  };
  return {
    id: m.id, a: side(m.entry_a), b: side(m.entry_b), sets: m.sets, status: m.status, outcome: m.outcome,
    winner: m.winner == null ? null : m.winner === m.entry_a ? "a" : "b", handicap_a: m.handicap_a, handicap_b: m.handicap_b, ...extra,
  };
}

export function GroupCard({ g, entries, editable, placeholder, qualifiers }: {
  g: EventView["groups"][number]; entries: Entries; editable?: boolean; placeholder?: string; qualifiers: number;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-2xl font-bold">Poule {groupLetter(g.no)}</p>
        {g.done && <span className="chip bg-lime/15 text-lime">terminée</span>}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-[10px] uppercase text-muted">
          <tr><th className="w-6">#</th><th>Joueur</th><th className="text-center">V</th><th className="text-center">D</th><th className="text-center">Manches</th><th className="text-right">Pts</th></tr>
        </thead>
        <tbody>
          {g.standings.map((s) => (
            <tr key={s.entry.id} className={`border-t border-line ${g.done && s.rank <= qualifiers ? "text-lime" : ""}`}>
              <td className="py-1 font-bold">{s.played ? s.rank : "–"}</td>
              <td className="max-w-0 truncate py-1 font-medium">{s.entry.name}<span className="ml-1 text-[10px] text-muted">{s.entry.club}</span></td>
              <td className="text-center tabular-nums">{s.won}</td>
              <td className="text-center tabular-nums">{s.lost}</td>
              <td className="text-center tabular-nums text-muted">{s.setsFor}-{s.setsAgainst}</td>
              <td className="text-right font-bold tabular-nums">{s.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1.5">
        {g.matches.map((m) => <MatchCard key={m.id} m={toVM(m, entries)} editable={editable} placeholder={placeholder} />)}
      </div>
    </div>
  );
}

export function Bracket({ rounds, entries, editable, placeholder }: { rounds: EventView["rounds"]; entries: Entries; editable?: boolean; placeholder?: string }) {
  if (!rounds.length) return null;
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {rounds.map((r) => (
          <div key={r.round} className="flex w-64 flex-col">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-brand-2">{roundLabel(r.round)}</p>
            <div className="flex flex-1 flex-col justify-around gap-2">
              {r.matches.map((m) => <MatchCard key={m.id} m={toVM(m, entries)} editable={editable} placeholder={placeholder} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Podium({ podium, big = false }: { podium: Entry[]; big?: boolean }) {
  if (!podium.length) return null;
  return (
    <ul className="space-y-2">
      {podium.map((e) => (
        <li key={e.id} className={`flex items-center gap-3 rounded-lg ${big ? "px-5 py-4 text-2xl" : "px-3 py-2"} ${e.final_rank === 1 ? "bg-lime text-ink" : "bg-white/5"}`}>
          {e.final_rank === 1 ? <Trophy className={big ? "h-8 w-8" : "h-5 w-5"} /> : <Medal className={`${big ? "h-8 w-8" : "h-5 w-5"} ${e.final_rank === 2 ? "text-slate-300" : "text-amber"}`} />}
          <span className="flex-1 font-bold">{e.name}<span className="ml-2 text-xs font-normal opacity-70">{e.club}</span></span>
          <span className="text-xs font-bold uppercase">{rankLabel(e.final_rank)}</span>
        </li>
      ))}
    </ul>
  );
}
