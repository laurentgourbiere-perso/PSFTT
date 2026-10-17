import { upcomingMatches, latestResults } from "@/lib/matches";
import { MatchCard } from "@/components/MatchCard";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata = { title: "Rencontres" };
export const dynamic = "force-dynamic";

export default function RencontresPage() {
  const upcoming = upcomingMatches(50);
  const results = latestResults(50);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 rounded-2xl border border-club-yellow/30 bg-club-yellow/10 p-4 text-sm text-club-yellow">
        🔌 Prototype : ces rencontres sont des données de démonstration. Elles seront remplacées par les données officielles de l&apos;API FFTT (calendrier, compositions, résultats partie par partie).
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <section className="min-w-0">
          <SectionTitle kicker="À venir" title="Calendrier" />
          <div className="space-y-3">{upcoming.map((m) => <MatchCard key={m.id} m={m} />)}</div>
        </section>
        <section className="min-w-0">
          <SectionTitle kicker="Déjà joués" title="Résultats" />
          <div className="space-y-3">{results.map((m) => <MatchCard key={m.id} m={m} />)}</div>
        </section>
      </div>
    </div>
  );
}
