import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, ROLE_LABELS } from "@/lib/roles";
import { teamMatches } from "@/lib/matches";
import { MatchCard } from "@/components/MatchCard";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata = { title: "Mon espace" };

export default async function EspacePage() {
  const user = await requireUser();
  const prof = db.prepare("SELECT p.*, t.name AS team_name FROM profiles p LEFT JOIN teams t ON t.id = p.team_id WHERE user_id = ?").get(user.id) as Record<string, string | number | null>;
  const next = prof.team_id ? teamMatches(prof.team_id as number).filter((m) => m.score_us == null).slice(0, 3) : [];
  const filled = ["nickname", "motto", "play_style", "hand", "favorite_shot", "photo_portrait", "photo_victory", "avatar"].filter((k) => prof[k]).length;
  const completion = Math.round((filled / 8) * 100);
  const openActions = can.seeMeetings(user.role)
    ? (db.prepare("SELECT COUNT(*) AS n FROM meeting_actions WHERE done = 0").get() as { n: number }).n
    : 0;

  const tiles = [
    { href: "/profil", icon: "🪪", title: "Ma fiche joueur", text: `Profil complété à ${completion} %`, show: true },
    { href: "/joueurs", icon: "📒", title: "L'album", text: "Toutes les cartes du club", show: true },
    { href: "/equipes", icon: "👥", title: "Équipes", text: "Compositions et forme du moment", show: true },
    { href: "/comite/reunions", icon: "📝", title: "Réunions", text: `${openActions} action(s) en cours`, show: can.seeMeetings(user.role) },
    { href: "/comite/budget", icon: "💶", title: "Budget", text: "Recettes, dépenses, solde", show: can.seeBudget(user.role) },
    { href: "/admin/utilisateurs", icon: "🛡️", title: "Utilisateurs", text: "Rôles et accès", show: can.manageUsers(user.role) },
  ].filter((t) => t.show);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="hero-bg relative mb-10 overflow-hidden rounded-3xl p-8">
        <div className="stripes absolute inset-0" />
        <p className="relative text-xs font-black uppercase tracking-widest text-club-yellow">{ROLE_LABELS[user.role]}</p>
        <h1 className="font-display relative text-5xl uppercase">Salut {user.first_name} ! 👋</h1>
        <p className="relative text-slate-200">{prof.team_name ? `Tu joues en ${prof.team_name}.` : "Pas encore d'équipe : le comité te placera après ta licence."}</p>
        {completion < 100 && (
          <div className="relative mt-4 max-w-sm">
            <div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-club-yellow" style={{ width: `${completion}%` }} /></div>
            <Link href="/profil" className="mt-2 inline-block text-sm font-bold text-club-yellow">Compléter ma carte Panini →</Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card-surface group p-6 transition hover:-translate-y-1 hover:border-club-yellow/60">
            <span className="text-4xl transition group-hover:scale-125 inline-block">{t.icon}</span>
            <p className="font-display mt-3 text-2xl uppercase">{t.title}</p>
            <p className="text-sm text-slate-400">{t.text}</p>
          </Link>
        ))}
      </div>

      {next.length > 0 && (
        <section className="mt-12">
          <SectionTitle kicker="Mon équipe" title="Mes prochains matchs" />
          <div className="space-y-3">{next.map((m) => <MatchCard key={m.id} m={m} />)}</div>
        </section>
      )}
    </div>
  );
}
