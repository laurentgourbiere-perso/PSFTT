import { requireUser } from "@/lib/auth";
import { MeetingForm } from "@/components/forms/MeetingForm";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata = { title: "Nouveau compte rendu" };

export default async function Page() {
  await requireUser("bureau");
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <SectionTitle kicker="Comité" title="Nouveau compte rendu" />
      <MeetingForm />
    </div>
  );
}
