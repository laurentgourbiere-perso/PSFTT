"use client";
import { useActionState, useEffect, useRef } from "react";
import { recordScore, drawEventAction, updateTournament, saveEvent, addPrize } from "@/app/actions/tournoi";
import { Feedback } from "@/components/forms/ProfileForms";
import type { Tournament, TEvent } from "@/lib/tournament";

/** Saisie rapide du score final, ou forfait. */
export function ScoreForm({ matchId, nameA, nameB }: { matchId: number; nameA: string; nameB: string }) {
  const [state, action, pending] = useActionState(recordScore, undefined);
  return (
    <div className="space-y-2">
      <form action={action} className="flex gap-2">
        <input type="hidden" name="id" value={matchId} />
        <input type="hidden" name="outcome" value="normal" />
        <input name="score" className="input !py-1.5 text-sm" placeholder="11-7 9-11 11-5 11-8" aria-label="Score par manche" autoComplete="off" />
        <button className="btn btn-primary !px-3 !py-1.5 !text-xs" disabled={pending}>OK</button>
      </form>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="text-slate-500">Forfait :</span>
        {([["forfait_a", nameA], ["forfait_b", nameB]] as const).map(([outcome, name]) => (
          <form key={outcome} action={action}>
            <input type="hidden" name="id" value={matchId} />
            <input type="hidden" name="outcome" value={outcome} />
            <button className="font-bold text-slate-400 hover:text-club-red" disabled={pending}>{name}</button>
          </form>
        ))}
      </div>
      <Feedback state={state?.error ? state : undefined} />
    </div>
  );
}

export function DrawForm({ eventId, redo, absents }: { eventId: number; redo: boolean; absents: number }) {
  const [state, action, pending] = useActionState(drawEventAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3" onSubmit={(e) => { if (redo && !confirm("Refaire le tirage ? Les poules actuelles seront effacées.")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={eventId} />
      <button className={`btn ${redo ? "btn-ghost" : "btn-red"}`} disabled={pending}>🎲 {redo ? "Refaire le tirage" : "Tirage au sort"}</button>
      {absents > 0 && (
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" name="absents" className="accent-[#ffd400]" /> Inclure les {absents} non pointé(s)
        </label>
      )}
      <Feedback state={state} />
    </form>
  );
}

export function TournamentForm({ t }: { t: Tournament }) {
  const [state, action, pending] = useActionState(updateTournament, undefined);
  const f = (name: keyof Tournament, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, span = "") => (
    <div className={span}>
      <label className="label" htmlFor={`t-${name}`}>{label}</label>
      <input className="input" id={`t-${name}`} name={name} defaultValue={String(t[name] ?? "")} {...props} />
    </div>
  );
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="id" value={t.id} />
      {f("name", "Nom", { required: true }, "sm:col-span-2")}
      {f("date", "Date", { type: "date", required: true })}
      <div>
        <label className="label" htmlFor="t-status">Statut</label>
        <select className="input" id="t-status" name="status" defaultValue={t.status}>
          <option value="brouillon">Brouillon (caché)</option>
          <option value="inscriptions">Inscriptions ouvertes</option>
          <option value="en_cours">En cours</option>
          <option value="termine">Terminé</option>
        </select>
      </div>
      {f("venue", "Lieu", {}, "sm:col-span-2")}
      {f("checkin_time", "Pointage dès", { type: "time" })}
      {f("start_time", "Début", { type: "time" })}
      {f("price_1", "1 tableau €", { type: "number", step: "0.5", min: 0 })}
      {f("price_2", "2 tableaux €", { type: "number", step: "0.5", min: 0 })}
      {f("price_double", "Double € / joueur", { type: "number", step: "0.5", min: 0 })}
      {f("max_events", "Tableaux max", { type: "number", min: 1, max: 10 })}
      {f("tables_count", "Tables dans la salle", { type: "number", min: 1, max: 60 })}
      <div className="sm:col-span-4">
        <label className="label" htmlFor="t-description">Présentation</label>
        <textarea className="input min-h-20" id="t-description" name="description" defaultValue={t.description ?? ""} />
      </div>
      <div className="sm:col-span-4">
        <label className="label" htmlFor="t-sponsors">Partenaires (un par ligne)</label>
        <textarea className="input min-h-20" id="t-sponsors" name="sponsors" defaultValue={t.sponsors ?? ""} />
      </div>
      <div className="flex items-center gap-4 sm:col-span-4">
        <button className="btn btn-primary" disabled={pending}>Enregistrer</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function EventForm({ tournamentId, ev }: { tournamentId: number; ev?: TEvent }) {
  const [state, action, pending] = useActionState(saveEvent, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && !ev) ref.current?.reset(); }, [state, ev]);
  const v = (k: keyof TEvent) => (ev?.[k] ?? "") as string | number;
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-6">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="event_id" value={ev?.id ?? ""} />
      <div className="sm:col-span-2"><label className="label">Nom</label><input className="input" name="name" required defaultValue={v("name")} placeholder="Toutes séries" /></div>
      <div><label className="label">Heure</label><input className="input" name="start_time" type="time" defaultValue={v("start_time")} /></div>
      <div><label className="label">Points mini</label><input className="input" name="min_points" type="number" defaultValue={v("min_points")} /></div>
      <div><label className="label">Points maxi</label><input className="input" name="max_points" type="number" defaultValue={v("max_points")} /></div>
      <div><label className="label">Né(e) dès</label><input className="input" name="min_birth_year" type="number" defaultValue={v("min_birth_year")} placeholder="année" /></div>
      <div>
        <label className="label">Formule</label>
        <select className="input" name="format" defaultValue={ev?.format ?? "poules"}><option value="poules">Poules + tableau</option><option value="ko">Élimination directe</option></select>
      </div>
      <div><label className="label">Joueurs / poule</label><input className="input" name="group_size" type="number" min={3} max={6} defaultValue={ev?.group_size ?? 3} /></div>
      <div><label className="label">Sortants</label><input className="input" name="qualifiers" type="number" min={1} max={3} defaultValue={ev?.qualifiers ?? 2} /></div>
      <div>
        <label className="label">Manches</label>
        <select className="input" name="best_of" defaultValue={ev?.best_of ?? 5}><option value={3}>2 gagnantes</option><option value={5}>3 gagnantes</option><option value={7}>4 gagnantes</option></select>
      </div>
      <div><label className="label">Places</label><input className="input" name="capacity" type="number" min={2} defaultValue={v("capacity")} placeholder="illimité" /></div>
      <div className="flex flex-col justify-end gap-1 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_double" defaultChecked={!!ev?.is_double} className="accent-[#ffd400]" /> Double</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="handicap" defaultChecked={!!ev?.handicap} className="accent-[#ffd400]" /> Handicap</label>
      </div>
      <div className="flex items-center gap-4 sm:col-span-6">
        <button className="btn btn-primary !py-2" disabled={pending}>{ev ? "Enregistrer" : "Ajouter le tableau"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function PrizeForm({ tournamentId, events }: { tournamentId: number; events: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(addPrize, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-6 sm:items-end">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <div className="sm:col-span-2"><label className="label">Lot</label><input className="input" name="label" required maxLength={120} placeholder="Coupe + bon d'achat 30 €" /></div>
      <div>
        <label className="label">Tableau</label>
        <select className="input" name="event_id"><option value="">Tombola</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      </div>
      <div>
        <label className="label">Place</label>
        <select className="input" name="rank"><option value="1">Vainqueur</option><option value="2">Finaliste</option><option value="3">Demi-finaliste</option></select>
      </div>
      <div><label className="label">Valeur €</label><input className="input" name="value" type="number" min={0} step="0.01" /></div>
      <div><label className="label">Quantité</label><input className="input" name="quantity" type="number" min={1} max={20} defaultValue={1} /></div>
      <div className="sm:col-span-3"><label className="label">Offert par</label><input className="input" name="sponsor" maxLength={80} placeholder="Partenaire (facultatif)" /></div>
      <div className="flex items-center gap-4 sm:col-span-3">
        <button className="btn btn-primary" disabled={pending}>Ajouter</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
