import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "@/components/forms/AuthForms";

export const metadata = { title: "Inscription" };

export default async function Page() {
  if (await getCurrentUser()) redirect("/espace");
  return (
    <AuthShell title="Rejoindre" subtitle="Créez votre compte supporter. Le comité vous passera adhérent après votre licence.">
      <RegisterForm />
    </AuthShell>
  );
}
