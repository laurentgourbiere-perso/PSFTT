import { redirect } from "next/navigation";
import { needsSetup, isOrganizer } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connexion" };

export default async function ConnexionPage() {
  if (needsSetup()) redirect("/bienvenue");
  if (await isOrganizer()) redirect("/");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <Logo size={48} />
      <div className="panel mt-6 p-6"><LoginForm /></div>
    </main>
  );
}
