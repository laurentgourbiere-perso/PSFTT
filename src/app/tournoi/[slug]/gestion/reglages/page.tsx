import { loadTournamentStaff } from "../../load";
import { getEvents, eventFill } from "@/lib/tournament";
import { deleteEvent } from "@/app/actions/tournoi";
import { GestionNav } from "@/components/tournoi/GestionNav";
import { StatusPill } from "@/components/tournoi/ui";
import { TournamentForm, EventForm } from "@/components/tournoi/StaffForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réglages du tournoi" };

export default async function ReglagesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await loadTournamentStaff(slug);
  const events = getEvents(t.id);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <GestionNav slug={t.slug} active="/reglages" />
      <section className="card-surface p-5">
        <p className="mb-4 font-display text-2xl uppercase">Le tournoi</p>
        <TournamentForm t={t} />
      </section>

      <section className="mt-8 space-y-3">
        <p className="font-display text-2xl uppercase">Tableaux</p>
        {events.map((e) => (
          <details key={e.id} className="card-surface p-4">
            <summary className="flex cursor-pointer items-center gap-3">
              <span className="flex-1 font-bold">{e.name}</span>
              <span className="text-sm text-slate-400">{eventFill(e.id)} inscrit(s)</span>
              <StatusPill status={e.status} />
            </summary>
            <div className="mt-4"><EventForm tournamentId={t.id} ev={e} /></div>
            {e.status === "inscriptions" && (
              <form action={deleteEvent} className="mt-3 text-right">
                <input type="hidden" name="id" value={e.id} />
                <button className="text-xs text-slate-500 hover:text-club-red">Supprimer ce tableau et ses inscriptions</button>
              </form>
            )}
          </details>
        ))}
        <div className="card-surface p-4">
          <p className="mb-3 font-bold">Nouveau tableau</p>
          <EventForm tournamentId={t.id} />
        </div>
      </section>
    </div>
  );
}
