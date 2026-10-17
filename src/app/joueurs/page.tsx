import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listPlayers, toCard } from "@/lib/players";
import { can } from "@/lib/roles";
import { PaniniCard } from "@/components/PaniniCard";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata = { title: "L'album des joueurs" };
export const dynamic = "force-dynamic";

export default async function JoueursPage() {
  const user = await getCurrentUser();
  const players = listPlayers(user);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <SectionTitle kicker="Saison 2025-2026" title="L'album du club" />
      {!can.seeMembers(user?.role) && (
        <p className="mb-6 rounded-xl bg-white/5 p-4 text-sm text-slate-300">
          Vous voyez les joueurs qui ont accepté d&apos;apparaître publiquement. <Link href="/connexion" className="font-bold text-club-yellow">Connectez-vous</Link> en tant qu&apos;adhérent pour voir tout l&apos;album.
        </p>
      )}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {players.map((p, i) => <PaniniCard key={p.id} p={toCard(p, i + 1)} />)}
      </div>
      {players.length === 0 && <p className="text-slate-400">Aucune carte à afficher pour le moment.</p>}
    </div>
  );
}
