"use client";
import { useActionState } from "react";
import { Megaphone } from "lucide-react";
import { autoCallAction, callAction } from "@/app/actions-competition";
import { Feedback } from "./forms";

/** Remplit d'un coup toutes les tables libres avec les prochains matchs jouables. */
export function AutoCallForm({ tournamentId, disabled, label }: { tournamentId: number; disabled: boolean; label: string }) {
  const [state, action, pending] = useActionState(autoCallAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={tournamentId} />
      <button className="btn btn-lime" disabled={disabled || pending}><Megaphone className="h-4 w-4" />{label}</button>
      <Feedback state={state} />
    </form>
  );
}

/** Appel manuel d'un match sur une table libre choisie. */
export function CallForm({ matchId, courts, courtLabel }: { matchId: number; courts: number[]; courtLabel: string }) {
  const [state, action, pending] = useActionState(callAction, undefined);
  return (
    <form action={action} className="flex items-center gap-1 text-xs">
      <input type="hidden" name="id" value={matchId} />
      <select name="court" className="rounded bg-white/10 px-1 py-0.5" aria-label={courtLabel}>
        {courts.map((n) => <option key={n} value={n} className="bg-ink">{courtLabel} {n}</option>)}
      </select>
      <button className="font-semibold text-lime hover:underline" disabled={pending}>Appeler</button>
      {state?.error && <span className="text-hot">{state.error}</span>}
    </form>
  );
}
