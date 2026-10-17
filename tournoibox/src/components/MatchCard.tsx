"use client";
import { useActionState, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { scoreAction, reopenAction } from "@/app/actions-competition";

export type Side = { name: string; club: string | null; points: number } | null;
export type MatchVM = {
  id: number; a: Side; b: Side; sets: number[][]; winner: "a" | "b" | null; status: string; outcome: string | null;
  handicap_a: number; handicap_b: number; title?: string; court?: string | null;
};

/** Un match : deux lignes de joueurs, manches, vainqueur. En mode édition : saisie du score ou forfait. */
export function MatchCard({ m, editable = false, placeholder = "11-7 9-11 11-5" }: { m: MatchVM; editable?: boolean; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(scoreAction, undefined);
  const [rstate, reopen, rpending] = useActionState(reopenAction, undefined);
  const done = m.status === "termine";
  const playable = !done && m.a && m.b;
  const wonA = m.sets.filter(([x, y]) => x > y).length, wonB = m.sets.filter(([x, y]) => y > x).length;

  const line = (side: "a" | "b") => {
    const p = side === "a" ? m.a : m.b;
    const hcp = side === "a" ? m.handicap_a : m.handicap_b;
    const isWinner = m.winner === side;
    return (
      <div className={`flex items-center gap-2 ${m.winner && !isWinner ? "opacity-45" : ""}`}>
        <span className={`min-w-0 flex-1 truncate text-sm ${isWinner ? "font-bold text-lime" : "font-medium"}`}>
          {p ? p.name : <span className="italic text-muted">{done ? "exempt" : "à venir"}</span>}
          {hcp > 0 && <span className="ml-1 rounded bg-lime/15 px-1 text-[10px] font-bold text-lime">+{hcp}</span>}
        </span>
        {m.sets.map((s, i) => (
          <span key={i} className={`w-6 text-center text-xs tabular-nums ${s[side === "a" ? 0 : 1] > s[side === "a" ? 1 : 0] ? "font-bold" : "text-muted"}`}>{s[side === "a" ? 0 : 1]}</span>
        ))}
        {done && m.outcome !== "exempt" && (
          <span className={`w-7 rounded text-center font-display text-base font-bold tabular-nums ${isWinner ? "bg-lime text-ink" : "bg-white/10"}`}>
            {m.outcome === "forfait" ? (isWinner ? "V" : "F") : side === "a" ? wonA : wonB}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`rounded-lg border p-2.5 ${playable ? "border-brand/50 bg-brand/5" : "border-line bg-white/[.02]"}`}>
      {(m.title || m.court) && (
        <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          {m.court && <span className="rounded bg-white/10 px-1.5 text-white">{m.court}</span>}
          {m.title && <span className="truncate">{m.title}</span>}
        </div>
      )}
      <div className="space-y-1">{line("a")}{line("b")}</div>

      {editable && playable && !open && (
        <button type="button" onClick={() => setOpen(true)} className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-2 hover:text-white">
          <Pencil className="h-3 w-3" />Saisir le résultat
        </button>
      )}
      {editable && playable && open && (
        <div className="mt-2 space-y-2">
          <form action={action} className="flex gap-2">
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="outcome" value="normal" />
            <input name="score" className="input !py-1 text-sm" placeholder={placeholder} aria-label="Score par manche" autoComplete="off" autoFocus />
            <button className="btn btn-primary !px-3 !py-1 text-xs" disabled={pending}>OK</button>
          </form>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-muted">Forfait de</span>
            {(["a", "b"] as const).map((s) => (
              <form key={s} action={action}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="outcome" value={`forfait_${s}`} />
                <button className="font-semibold text-muted hover:text-hot" disabled={pending}>{(s === "a" ? m.a : m.b)?.name}</button>
              </form>
            ))}
            <button type="button" onClick={() => setOpen(false)} className="ml-auto text-muted hover:text-white">annuler</button>
          </div>
          {state?.error && <p className="text-xs font-semibold text-hot">{state.error}</p>}
        </div>
      )}
      {editable && done && m.outcome !== "exempt" && (
        <form action={reopen} className="mt-1 text-right">
          <input type="hidden" name="id" value={m.id} />
          <button className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-amber" disabled={rpending} title="Annuler ce résultat pour le ressaisir">
            <RotateCcw className="h-3 w-3" />corriger
          </button>
          {rstate?.error && <p className="text-left text-xs font-semibold text-hot">{rstate.error}</p>}
        </form>
      )}
    </div>
  );
}
