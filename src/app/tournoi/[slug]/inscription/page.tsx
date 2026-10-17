import Link from "next/link";
import { loadTournament, regEvents } from "../load";
import { db } from "@/lib/db";
import { RegistrationForm } from "@/components/tournoi/RegistrationForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inscription au tournoi" };

export default async function InscriptionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, user } = await loadTournament(slug);
  if (t.status !== "inscriptions") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="card-surface p-6 text-lg">Les inscriptions en ligne sont fermées. {t.status !== "termine" && "Vous pouvez encore vous inscrire sur place, au pointage."} <Link className="text-club-yellow underline" href={`/tournoi/${t.slug}`}>Retour</Link></p>
      </div>
    );
  }
  // Pré-remplissage pour les membres connectés
  const defaults: Record<string, string> = {};
  if (user) {
    const p = db.prepare("SELECT licence_number FROM profiles WHERE user_id = ?").get(user.id) as { licence_number: string | null } | undefined;
    Object.assign(defaults, { first_name: user.first_name, last_name: user.last_name, email: user.email, club: "PSFTT", licence: p?.licence_number ?? "" });
  }
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="card-surface p-6 sm:p-8">
        <RegistrationForm tournamentId={t.id} events={regEvents(t.id)} prices={t} defaults={defaults} />
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Vos coordonnées servent uniquement à l&apos;organisation du tournoi. Voir notre <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.
      </p>
    </div>
  );
}
