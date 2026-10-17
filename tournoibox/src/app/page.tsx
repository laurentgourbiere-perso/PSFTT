import Link from "next/link";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { requireOrganizer } from "@/lib/auth";
import { listTournaments, eventFills, playerCount } from "@/lib/tournament";
import { sportOf } from "@/lib/sports";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

const STATUS = { inscriptions: "Inscriptions", en_cours: "En cours", termine: "Terminé" } as const;

export default async function Home() {
  await requireOrganizer();
  const list = listTournaments();
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl font-bold">Mes tournois</h1>
            <p className="text-muted">Créez un tournoi en deux minutes, inscrivez les joueurs au fil de leur arrivée.</p>
          </div>
          <Link href="/nouveau" className="btn btn-lime"><Plus className="h-4 w-4" />Nouveau tournoi</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => {
            const fills = eventFills(t.id);
            const free = fills.reduce((n, e) => n + (e.free ?? 0), 0);
            const unlimited = fills.some((e) => e.free == null);
            return (
              <Link key={t.id} href={`/t/${t.id}/inscriptions`} className="panel block p-5 transition hover:!border-brand">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{sportOf(t.sport).emoji}</span>
                  <span className="chip bg-brand/20 text-brand-2">{STATUS[t.status]}</span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold">{t.name}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">
                  <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{new Date(t.date).toLocaleDateString("fr-FR", { dateStyle: "medium" })}</span>
                  {t.venue && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{t.venue}</span>}
                </p>
                <p className="mt-3 text-sm"><b>{playerCount(t.id)}</b> joueurs · <b className="text-lime">{unlimited ? "places ouvertes" : `${free} places libres`}</b> · {fills.length} tableaux</p>
              </Link>
            );
          })}
          {list.length === 0 && (
            <Link href="/nouveau" className="panel flex flex-col items-center justify-center gap-2 border-dashed p-10 text-center text-muted hover:!border-brand md:col-span-2 lg:col-span-3">
              <Plus className="h-8 w-8" />Aucun tournoi pour l&apos;instant. Créez le premier !
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
