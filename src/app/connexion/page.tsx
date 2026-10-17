import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/forms/AuthForms";

export const metadata = { title: "Connexion" };

export default async function Page() {
  if (await getCurrentUser()) redirect("/espace");
  return <AuthShell title="Connexion" subtitle="Content de vous revoir à la table !"><LoginForm /></AuthShell>;
}
