import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { listPlayers } from "@/lib/players";
import { can } from "@/lib/roles";
import { teamMatches, outcome } from "@/lib/matches";
import { SectionTitle } from "@/components/SectionTitle";
import { BallAvatar } from "@/components/Avatar";
import { parseAvatar } from "@/lib/avatar";

export const metadata = { title: "Équipes" };
export const dynamic = "force-dynamic";

type Team = { id: number; name: string; division: string | null; color: string | null; captain: string | null };

export default async function EquipesPage() {
  const user = await getCurrentUser();
  const teams = db.prepare(`SELECT t.*, u.first_name || ' ' || substr(u.last_name, 1, 1) || '.' AS captain FROM teams t LEFT JOIN users u ON u.id = t.captain_id ORDER BY t.id`).all() as Team[];
  const players = listPlayers(user);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <SectionTitle kicker="Championnat par équipes" title="Nos équipes" />
      <div className="grid gap-6 md:grid-cols-2">
        {teams.map((t) => {
          const roster = players.filter((p) => p.team_id === t.id);
          const ms = teamMatches(t.id);
          const form = ms.map(outcome).filter(Boolean).slice(-5);
          const pts = ms.reduce((s, m) => s + (outcome(m) === "V" ? 3 : outcome(m) === "N" ? 2 : outcome(m) === "D" ? 1 : 0), 0);
          return (
            <article key={t.id} className="card-surface overflow-hidden">
              <div className="relative p-6" style={{ background: `linear-gradient(120deg, ${t.color ?? "#0b3c8c"}, transparent)` }}>
                <div className="stripes absolute inset-0" />
                <p className="relative text-xs font-black uppercase tracking-widest text-white/80">{t.division}</p>
                <h3 className="font-display relative text-4xl uppercase">{t.name}</h3>
                <p className="relative text-sm">Capitaine : <b>{can.seeMembers(user?.role) ? t.captain ?? "à désigner" : "réservé aux adhérents"}</b> · {pts} pts au classement</p>
                <div className="relative mt-3 flex gap-1">
                  {form.map((o, i) => (
                    <span key={i} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${o === "V" ? "bg-emerald-500" : o === "D" ? "bg-club-red" : "bg-slate-500"}`}>{o}</span>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-white/5">
                {roster.map((p) => (
                  <li key={p.id}>
                    <Link href={`/joueurs/${p.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-white/5">
                      <span className="overflow-hidden rounded-full"><BallAvatar config={parseAvatar(p.avatar) ?? undefined} className="h-9 w-9" /></span>
                      <span className="flex-1 font-semibold">{p.first_name} {p.last_name}{p.nickname && <span className="ml-2 text-sm text-slate-400">« {p.nickname} »</span>}</span>
                      <span className="font-display text-xl text-club-yellow">{p.points}</span>
                    </Link>
                  </li>
                ))}
                {roster.length === 0 && <li className="px-6 py-3 text-sm text-slate-400">Composition visible des adhérents connectés.</li>}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
