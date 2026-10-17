import { notFound } from "next/navigation";
import { getTournament, eventFills, hallFree, playerCount } from "@/lib/tournament";
import { sportOf } from "@/lib/sports";
import { AutoRefresh } from "@/components/ui";
import { FillCard } from "@/components/FillCard";
import { Logo } from "@/components/Logo";
import { Clock, FullscreenButton } from "./ScreenTools";

export const dynamic = "force-dynamic";
export const metadata = { title: "Écran de la salle" };

/**
 * Écran de diffusion (vidéoprojecteur, télé). Lecture seule, sans mot de passe :
 * TournoiBox n'est joignable que depuis ce PC.
 * Mode actuel : « Inscriptions » (places restantes). Les modes poules, tableaux et résultats suivront.
 */
export default async function EcranPage({ params }: { params: Promise<{ id: string }> }) {
  const t = getTournament(Number((await params).id));
  if (!t) notFound();
  const fills = eventFills(t.id);
  const free = hallFree(t);
  const sport = sportOf(t.sport);
  const cols = fills.length <= 2 ? "grid-cols-2" : fills.length <= 4 ? "grid-cols-2" : fills.length <= 6 ? "grid-cols-3" : "grid-cols-4";

  return (
    <main className="flex min-h-screen cursor-none flex-col p-8" style={{ background: "radial-gradient(70rem 40rem at 90% -10%, rgb(124 92 255 / .35), transparent 60%), #0c0f1d" }}>
      <AutoRefresh seconds={3} />
      <header className="flex items-center gap-6">
        <span className="text-6xl">{sport.emoji}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-6xl font-bold">{t.name}</h1>
          <p className="text-2xl text-muted">Inscriptions ouvertes à la table de marque</p>
        </div>
        <div className="text-right">
          <Clock />
          <p className="text-xl text-muted">{playerCount(t.id)} joueurs inscrits{free != null && ` · ${free} place(s) dans la salle`}</p>
        </div>
      </header>

      <section className={`mt-8 grid flex-1 content-center gap-6 ${cols}`}>
        {fills.map((ev) => <FillCard key={ev.id} ev={ev} big />)}
      </section>

      <footer className="mt-6 flex items-center justify-between text-muted">
        <Logo size={28} />
        <FullscreenButton />
      </footer>
    </main>
  );
}
