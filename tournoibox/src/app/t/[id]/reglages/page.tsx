import { getTournament } from "@/lib/tournament";
import { deleteTournament } from "@/app/actions";
import { TournamentSettingsForm, PasswordForm } from "@/components/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réglages" };

export default async function ReglagesPage({ params }: { params: Promise<{ id: string }> }) {
  const t = getTournament(Number((await params).id))!;
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <section className="panel p-5">
        <p className="mb-4 font-display text-2xl font-bold">Tournoi</p>
        <TournamentSettingsForm t={t} />
      </section>
      <section className="panel p-5">
        <p className="mb-1 font-display text-2xl font-bold">Mot de passe organisateur</p>
        <p className="mb-4 text-sm text-muted">Le changer déconnecte toutes les autres fenêtres ouvertes.</p>
        <PasswordForm />
      </section>
      <section className="panel border-hot/40 p-5">
        <p className="mb-1 font-display text-2xl font-bold text-hot">Supprimer le tournoi</p>
        <p className="mb-3 text-sm text-muted">Efface définitivement le tournoi, ses joueurs et ses résultats. Tapez SUPPRIMER pour confirmer.</p>
        <form action={deleteTournament} className="flex gap-2">
          <input type="hidden" name="id" value={t.id} />
          <input className="input !w-48" name="confirm" placeholder="SUPPRIMER" autoComplete="off" />
          <button className="btn bg-hot text-white">Supprimer</button>
        </form>
      </section>
    </main>
  );
}
