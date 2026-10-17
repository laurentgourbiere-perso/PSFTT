import { requireOrganizer } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { NewTournamentForm } from "@/components/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nouveau tournoi" };

export default async function NouveauPage() {
  await requireOrganizer();
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-6 font-display text-5xl font-bold">Nouveau tournoi</h1>
        <NewTournamentForm />
      </main>
    </>
  );
}
