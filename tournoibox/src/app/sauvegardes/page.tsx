import { FolderOpen, ShieldCheck } from "lucide-react";
import { requireOrganizer } from "@/lib/auth";
import { listBackups, BACKUP_DIR } from "@/lib/backup";
import { TopBar } from "@/components/TopBar";
import { BackupNowButton, RestoreButton, ImportForm } from "@/components/BackupForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sauvegardes" };

const KIND = { auto: "Automatique", manuelle: "Manuelle", demarrage: "Au démarrage", "avant-restauration": "Avant restauration", import: "Import" } as Record<string, string>;
const size = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.ceil(n / 1024)} Ko`);

export default async function SauvegardesPage() {
  await requireOrganizer();
  const backups = listBackups();
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="font-display text-5xl font-bold">Sauvegardes</h1>
          <p className="mt-1 flex items-start gap-2 text-muted">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-lime" />
            TournoiBox sauvegarde tout seul la base au démarrage, puis toutes les 2 minutes dès que quelque chose change (les 40 dernières sont gardées).
            En cas de panne du PC, copiez une sauvegarde sur une clé USB et importez-la sur un autre PC.
          </p>
        </div>

        <section className="panel p-5"><BackupNowButton /></section>

        <section className="panel p-5">
          <p className="mb-3 font-display text-2xl font-bold">Historique</p>
          {backups.length ? (
            <ul className="divide-y divide-line text-sm">
              {backups.map((b) => {
                const label = b.date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
                return (
                  <li key={b.name} className="flex flex-wrap items-center gap-3 py-2">
                    <span className="w-40 font-semibold tabular-nums">{label}</span>
                    <span className="chip bg-white/10">{KIND[b.kind] ?? b.kind}</span>
                    <span className="flex-1 text-xs text-muted">{size(b.size)}</span>
                    <a href={`/sauvegardes/fichier/${b.name}`} className="text-xs font-semibold text-brand-2 hover:underline">Télécharger</a>
                    <RestoreButton name={b.name} label={label} />
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted">Pas encore de sauvegarde : la première sera faite dès le premier tournoi créé.</p>}
          <p className="mt-3 flex items-center gap-1 text-xs text-muted"><FolderOpen className="h-3 w-3" />Dossier : {BACKUP_DIR}</p>
        </section>

        <section className="panel p-5">
          <p className="mb-1 font-display text-2xl font-bold">Importer une sauvegarde</p>
          <p className="mb-3 text-sm text-muted">Un fichier .db venant d&apos;une clé USB ou d&apos;un autre PC TournoiBox. Il remplace toutes les données actuelles (sauvegardées juste avant).</p>
          <ImportForm />
        </section>
      </main>
    </>
  );
}
