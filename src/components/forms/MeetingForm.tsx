"use client";
import { useActionState } from "react";
import { createMeeting } from "@/app/actions/comite";
import { MEETING_KINDS } from "@/lib/meetings";
import { Feedback } from "./ProfileForms";

export function MeetingForm() {
  const [state, action, pending] = useActionState(createMeeting, undefined);
  return (
    <form action={action} className="card-surface space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2"><label className="label" htmlFor="title">Titre</label><input className="input" id="title" name="title" required maxLength={120} placeholder="Ex. Comité de rentrée" /></div>
        <div><label className="label" htmlFor="date">Date</label><input className="input" id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
        <div><label className="label" htmlFor="kind">Type</label>
          <select className="input" id="kind" name="kind">{Object.entries(MEETING_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        </div>
        <div><label className="label" htmlFor="visibility">Visible par</label>
          <select className="input" id="visibility" name="visibility"><option value="bureau">Comité seulement</option><option value="adherents">Tous les adhérents</option></select>
        </div>
        <div><label className="label" htmlFor="attendees">Présents</label><input className="input" id="attendees" name="attendees" placeholder="Prénoms ou fonctions" /></div>
      </div>
      <div><label className="label" htmlFor="content">Compte rendu</label><textarea className="input min-h-48" id="content" name="content" required placeholder="Ordre du jour, échanges…" /></div>
      <div><label className="label" htmlFor="decisions">Décisions prises</label><textarea className="input min-h-24" id="decisions" name="decisions" /></div>
      <div>
        <label className="label" htmlFor="actions">Actions à suivre</label>
        <textarea className="input min-h-24 font-mono text-sm" id="actions" name="actions" placeholder={"Une action par ligne :\nRéserver le gymnase pour le tournoi | Président | 2026-01-15\nCommander les maillots | Trésorier"} />
      </div>
      <Feedback state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Publier le compte rendu"}</button>
    </form>
  );
}
