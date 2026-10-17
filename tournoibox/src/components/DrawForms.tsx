"use client";
import { useActionState } from "react";
import { Dices, Shuffle } from "lucide-react";
import { drawAction, swapAction } from "@/app/actions-competition";
import { Feedback } from "./forms";

export function DrawForm({ eventId, redo, absents }: { eventId: number; redo: boolean; absents: number }) {
  const [state, action, pending] = useActionState(drawAction, undefined);
  return (
    <form action={action} className="space-y-3"
      onSubmit={(e) => { if (redo && !confirm("Refaire le tirage ? Les poules actuelles seront remplacées.")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={eventId} />
      {absents > 0 && (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="absents" className="accent-[#7c5cff]" />
          Inclure les {absents} joueur(s) marqué(s) absent(s)
        </label>
      )}
      <button className={`btn ${redo ? "btn-ghost" : "btn-lime"} w-full`} disabled={pending}>
        <Dices className="h-4 w-4" />{pending ? "Tirage…" : redo ? "Refaire le tirage" : "Lancer le tirage au sort"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function SwapForm({ eventId, players }: { eventId: number; players: { id: number; label: string }[] }) {
  const [state, action, pending] = useActionState(swapAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={eventId} />
      <p className="label">Échanger deux joueurs de poule</p>
      {(["a", "b"] as const).map((k) => (
        <select key={k} name={k} className="input text-sm" required defaultValue="" aria-label={k === "a" ? "Premier joueur" : "Second joueur"}>
          <option value="" disabled>{k === "a" ? "Joueur…" : "…avec"}</option>
          {players.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      ))}
      <button className="btn btn-ghost w-full" disabled={pending}><Shuffle className="h-4 w-4" />Échanger</button>
      <Feedback state={state} />
    </form>
  );
}
