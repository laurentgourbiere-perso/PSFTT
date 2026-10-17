import type { MatchRow } from "@/lib/matches";
import { formatDate, outcome } from "@/lib/matches";

const OUTCOME_STYLE = { V: "bg-emerald-500", D: "bg-club-red", N: "bg-slate-500" };

export function MatchCard({ m }: { m: MatchRow }) {
  const o = outcome(m);
  const us = <span className="font-bold text-white">PSFTT {m.team_name.replace("PSFTT ", "")}</span>;
  const them = <span className="text-slate-300">{m.opponent}</span>;
  return (
    <div className="card-surface flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-club-yellow/50">
      <div className="w-16 shrink-0 text-center">
        <p className="font-display text-2xl leading-none text-club-yellow">{formatDate(m.date, { day: "2-digit" })}</p>
        <p className="text-xs uppercase text-slate-400">{formatDate(m.date, { month: "short" })}</p>
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {m.division ?? "Championnat"} {m.round ? `· J${m.round}` : ""} · {m.home ? "🏠 Domicile" : "🚗 Extérieur"}
        </p>
        <p className="truncate">{m.home ? <>{us} <span className="text-slate-500">vs</span> {them}</> : <>{them} <span className="text-slate-500">vs</span> {us}</>}</p>
      </div>
      {o ? (
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl">{m.score_us}-{m.score_them}</span>
          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${OUTCOME_STYLE[o]}`}>{o}</span>
        </div>
      ) : (
        <span className="rounded-full bg-club-yellow/15 px-3 py-1 text-xs font-bold uppercase text-club-yellow">À venir</span>
      )}
    </div>
  );
}
