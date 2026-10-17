"use client";
import { useActionState } from "react";
import { HardDriveDownload, RotateCcw, Save, Upload } from "lucide-react";
import { backupAction, restoreAction, importAction } from "@/app/actions-system";
import { Feedback } from "./forms";

export function BackupNowButton() {
  const [state, action, pending] = useActionState(backupAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button className="btn btn-primary" disabled={pending}><Save className="h-4 w-4" />Sauvegarder maintenant</button>
      <a href="/sauvegardes/fichier/actuelle" className="btn btn-ghost"><HardDriveDownload className="h-4 w-4" />Télécharger la base (clé USB)</a>
      <Feedback state={state} />
    </form>
  );
}

export function RestoreButton({ name, label }: { name: string; label: string }) {
  const [state, action, pending] = useActionState(restoreAction, undefined);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(`Revenir à l'état du ${label} ? L'état actuel sera sauvegardé avant.`)) e.preventDefault(); }}>
      <input type="hidden" name="name" value={name} />
      <button className="inline-flex items-center gap-1 text-xs font-semibold text-amber hover:underline" disabled={pending}><RotateCcw className="h-3 w-3" />Restaurer</button>
      {state && <span className={`ml-2 text-xs ${state.error ? "text-hot" : "text-lime"}`}>{state.error ?? state.ok}</span>}
    </form>
  );
}

export function ImportForm() {
  const [state, action, pending] = useActionState(importAction, undefined);
  return (
    <form action={action} className="space-y-2" onSubmit={(e) => { if (!confirm("Remplacer toutes les données par ce fichier ? L'état actuel sera sauvegardé avant.")) e.preventDefault(); }}>
      <input type="file" name="file" accept=".db" required className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" />
      <button className="btn btn-ghost" disabled={pending}><Upload className="h-4 w-4" />Importer et restaurer</button>
      <Feedback state={state} />
    </form>
  );
}
