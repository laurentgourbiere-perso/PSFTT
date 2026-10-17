"use client";
import { useActionState, useEffect, useRef } from "react";
import { Dices } from "lucide-react";
import { addPrize, drawRaffleAction } from "@/app/actions-prizes";
import { Feedback } from "./forms";

export function PrizeForm({ tournamentId, events }: { tournamentId: number; events: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(addPrize, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-6 sm:items-end">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <div className="sm:col-span-2"><label className="label" htmlFor="p-label">Lot</label><input className="input" id="p-label" name="label" required maxLength={120} placeholder="Bon d'achat 30 €, raquette…" /></div>
      <div>
        <label className="label" htmlFor="p-event">Pour</label>
        <select className="input" id="p-event" name="event_id"><option value="">la tombola</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      </div>
      <div>
        <label className="label" htmlFor="p-rank">Place</label>
        <select className="input" id="p-rank" name="rank"><option value="1">Vainqueur</option><option value="2">Finaliste</option><option value="3">Demi-finaliste</option><option value="4">4e</option></select>
      </div>
      <div><label className="label" htmlFor="p-value">Valeur €</label><input className="input" id="p-value" name="value" type="number" min={0} step="0.01" /></div>
      <div><label className="label" htmlFor="p-qty">Quantité</label><input className="input" id="p-qty" name="quantity" type="number" min={1} max={50} defaultValue={1} /></div>
      <div className="sm:col-span-3"><label className="label" htmlFor="p-sponsor">Offert par</label><input className="input" id="p-sponsor" name="sponsor" maxLength={80} placeholder="Partenaire (facultatif)" /></div>
      <div className="flex items-center gap-3 sm:col-span-3"><button className="btn btn-primary" disabled={pending}>Ajouter</button><Feedback state={state} /></div>
      <p className="text-xs text-muted sm:col-span-6">La place est ignorée pour la tombola. Pour les demi-finalistes, prévoyez une quantité de 2.</p>
    </form>
  );
}

export function RaffleButton({ prizeId, disabled }: { prizeId: number; disabled: boolean }) {
  const [state, action, pending] = useActionState(drawRaffleAction, undefined);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={prizeId} />
      <button className="chip !py-1 bg-brand text-white hover:brightness-110" disabled={pending || disabled}><Dices className="h-3 w-3" />{pending ? "…" : "Tirer au sort"}</button>
      {state?.error && <span className="text-xs text-hot">{state.error}</span>}
    </form>
  );
}
