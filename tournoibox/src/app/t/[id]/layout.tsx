import { notFound } from "next/navigation";
import { Monitor } from "lucide-react";
import { requireOrganizer } from "@/lib/auth";
import { getTournament } from "@/lib/tournament";
import { TopBar } from "@/components/TopBar";
import { OpenScreenButton } from "@/components/ui";
import { TabLinks } from "./TabLinks";

export default async function TournamentLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  await requireOrganizer();
  const t = getTournament(Number((await params).id));
  if (!t) notFound();
  return (
    <>
      <TopBar>
        <span className="mr-3 truncate font-display text-lg font-bold text-brand-2">{t.name}</span>
        <TabLinks id={t.id} />
      </TopBar>
      <div className="mx-auto flex max-w-7xl justify-end px-4 pt-4">
        <OpenScreenButton href={`/ecran/${t.id}`}><Monitor className="h-4 w-4" />Ouvrir l&apos;écran de la salle</OpenScreenButton>
      </div>
      {children}
    </>
  );
}
