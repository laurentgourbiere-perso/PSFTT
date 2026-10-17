import { ArrowDown, ArrowUp } from "lucide-react";
import { getTournament, eventFills } from "@/lib/tournament";
import { sportOf } from "@/lib/sports";
import { deleteEvent, moveEvent } from "@/app/actions";
import { EventForm } from "@/components/forms";
import { FillCard } from "@/components/FillCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tableaux" };

export default async function TableauxPage({ params }: { params: Promise<{ id: string }> }) {
  const t = getTournament(Number((await params).id))!;
  const fills = eventFills(t.id);
  const pointsLabel = sportOf(t.sport).pointsLabel;
  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <p className="text-sm text-muted">Augmenter les places d&apos;un tableau complet fait automatiquement monter les joueurs de la liste d&apos;attente.</p>
      {fills.map((ev, i) => (
        <section key={ev.id} className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <FillCard ev={ev} />
            <div className="flex gap-2">
              {i > 0 && <form action={moveEvent}><input type="hidden" name="id" value={ev.id} /><input type="hidden" name="dir" value="up" /><button className="btn btn-ghost !px-2 !py-1" title="Monter"><ArrowUp className="h-4 w-4" /></button></form>}
              {i < fills.length - 1 && <form action={moveEvent}><input type="hidden" name="id" value={ev.id} /><input type="hidden" name="dir" value="down" /><button className="btn btn-ghost !px-2 !py-1" title="Descendre"><ArrowDown className="h-4 w-4" /></button></form>}
              {ev.status === "inscriptions" && (
                <form action={deleteEvent} className="ml-auto"><input type="hidden" name="id" value={ev.id} /><button className="text-xs text-muted hover:text-hot">Supprimer le tableau</button></form>
              )}
            </div>
          </div>
          <div className="panel p-4"><EventForm tournamentId={t.id} ev={ev} pointsLabel={pointsLabel} /></div>
        </section>
      ))}
      <section className="panel p-4">
        <p className="mb-3 font-display text-xl font-bold">Ajouter un tableau</p>
        <EventForm tournamentId={t.id} pointsLabel={pointsLabel} />
      </section>
    </main>
  );
}
