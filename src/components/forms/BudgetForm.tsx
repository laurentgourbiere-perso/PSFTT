"use client";
import { useActionState, useRef, useEffect } from "react";
import { addBudgetEntry } from "@/app/actions/comite";
import { Feedback } from "./ProfileForms";

export const BUDGET_CATEGORIES = ["Cotisations", "Licences FFTT", "Subventions", "Sponsors", "Buvette", "Tournoi", "Matériel", "Déplacements", "Engagements équipes", "Salle", "Communication", "Divers"];

export function BudgetForm({ season }: { season: string }) {
  const [state, action, pending] = useActionState(addBudgetEntry, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="card-surface grid gap-3 p-5 sm:grid-cols-6 sm:items-end">
      <input type="hidden" name="season" value={season} />
      <div className="sm:col-span-2"><label className="label" htmlFor="label">Libellé</label><input className="input" id="label" name="label" required maxLength={120} /></div>
      <div><label className="label" htmlFor="category">Catégorie</label>
        <select className="input" id="category" name="category">{BUDGET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <div><label className="label" htmlFor="kind">Sens</label>
        <select className="input" id="kind" name="kind"><option value="depense">Dépense</option><option value="recette">Recette</option></select>
      </div>
      <div><label className="label" htmlFor="amount">Montant €</label><input className="input" id="amount" name="amount" type="number" step="0.01" min="0.01" required /></div>
      <div><label className="label" htmlFor="date">Date</label><input className="input" id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
      <div className="sm:col-span-6 flex items-center gap-4">
        <button className="btn btn-primary" disabled={pending}>Ajouter</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
