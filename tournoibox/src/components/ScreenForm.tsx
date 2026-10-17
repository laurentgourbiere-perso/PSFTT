"use client";
import { useActionState } from "react";
import { updateScreen } from "@/app/actions-screen";
import { Feedback } from "./forms";

/** Annonce défilante et durée des diapositives. Le mode est conservé tel quel. */
export function ScreenForm({ id, mode, message, seconds }: { id: number; mode: string; message: string | null; seconds: number }) {
  const [state, action, pending] = useActionState(updateScreen, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="screen_mode" value={mode} />
      <div>
        <label className="label" htmlFor="screen_message">Annonce (défile en bas de l&apos;écran)</label>
        <input className="input" id="screen_message" name="screen_message" maxLength={200} defaultValue={message ?? ""} placeholder="Remise des prix à 18h · Buvette ouverte !" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="slide_seconds">Durée d&apos;une diapositive</label>
          <div className="flex items-center gap-2">
            <input className="input !w-24" id="slide_seconds" name="slide_seconds" type="number" min={5} max={120} defaultValue={seconds} />
            <span className="text-sm text-muted">secondes</span>
          </div>
        </div>
        <button className="btn btn-primary" disabled={pending}>Enregistrer</button>
        <p className="text-xs text-muted">Videz le champ pour retirer l&apos;annonce.</p>
      </div>
      <Feedback state={state} />
    </form>
  );
}
