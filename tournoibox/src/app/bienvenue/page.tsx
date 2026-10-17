import { redirect } from "next/navigation";
import { needsSetup } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { SetupForm } from "@/components/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bienvenue" };

export default function BienvenuePage() {
  if (!needsSetup()) redirect("/");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Logo size={56} />
      <h1 className="mt-6 font-display text-4xl font-bold">Bienvenue !</h1>
      <p className="mt-2 text-muted">
        Choisissez le mot de passe organisateur. Il protège la création des tournois, les inscriptions et les résultats :
        les spectateurs devant l&apos;écran ne pourront rien modifier.
      </p>
      <div className="panel mt-6 p-6"><SetupForm /></div>
      <p className="mt-4 text-xs text-muted">TournoiBox fonctionne sans internet et n&apos;est accessible que depuis ce PC. Aucune donnée ne sort de l&apos;ordinateur.</p>
    </main>
  );
}
