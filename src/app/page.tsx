import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listPlayers, toCard } from "@/lib/players";
import { latestResults, upcomingMatches, outcome } from "@/lib/matches";
import { db } from "@/lib/db";
import { PaniniCard } from "@/components/PaniniCard";
import { MatchCard } from "@/components/MatchCard";
import { SectionTitle } from "@/components/SectionTitle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const players = listPlayers(user);
  const stars = players.slice(0, 3).map((p, i) => toCard(p, i + 1));
  const upcoming = upcomingMatches(4);
  const results = latestResults(6);
  const news = db.prepare("SELECT * FROM news ORDER BY date DESC LIMIT 3").all() as { id: number; title: string; body: string; emoji: string | null; date: string }[];
  const stats = db.prepare(`SELECT (SELECT COUNT(*) FROM users WHERE role != 'visiteur') AS members, (SELECT COUNT(*) FROM teams) AS teams,
    (SELECT COUNT(*) FROM matches WHERE score_us > score_them) AS wins`).get() as { members: number; teams: number; wins: number };

  return (
    <>
      {/* HERO */}
      <section className="hero-bg relative overflow-hidden">
        <div className="stripes absolute inset-0" />
        <div className="bounce-ball absolute right-[8%] top-16 hidden h-8 w-8 rounded-full bg-white shadow-[0_0_30px_rgba(255,255,255,.7)] md:block" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="skew-tag mb-6 bg-club-red text-sm font-black uppercase tracking-widest"><span>1985 → 2025 · 40 ans</span></span>
            <h1 className="font-display text-6xl uppercase leading-[0.9] sm:text-7xl lg:text-8xl">
              Ça <span className="text-club-yellow">smashe</span><br />
              à Pontcharra<br />
              <span className="text-stroke">&amp; Saint-Forgeux</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-slate-200">
              Compétition, loisir, jeunes ou vétérans : le PSFTT, c&apos;est 40 ans de top spins, de remontadas en 5e manche et de 3e mi-temps.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={user ? "/espace" : "/inscription"} className="btn btn-primary">{user ? "Mon espace" : "Rejoindre le club"}</Link>
              <Link href="/rencontres" className="btn btn-ghost">Les rencontres</Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {[
                { v: stats.members, l: "Pongistes" },
                { v: stats.teams, l: "Équipes" },
                { v: stats.wins, l: "Victoires cette saison" },
              ].map((s) => (
                <div key={s.l} className="card-surface p-3 text-center">
                  <dd className="font-display text-4xl text-club-yellow">{s.v}</dd>
                  <dt className="text-[11px] font-bold uppercase text-slate-300">{s.l}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto h-[440px] w-full max-w-md overflow-hidden sm:overflow-visible">
            {stars.map((c, i) => (
              <div
                key={c.id}
                className="float absolute w-40 sm:w-52"
                style={{
                  left: `${[0, 28, 52][i]}%`,
                  top: `${[12, 0, 18][i]}%`,
                  zIndex: [1, 3, 2][i],
                  animationDelay: `${i * 0.8}s`,
                }}
              >
                <PaniniCard p={c} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BANDEAU RÉSULTATS */}
      {results.length > 0 && (
        <div className="overflow-hidden border-y border-white/10 bg-club-yellow py-2 text-club-navy">
          <div className="marquee flex w-max gap-10 whitespace-nowrap font-display text-lg uppercase">
            {[...results, ...results].map((m, i) => (
              <span key={i}>
                {outcome(m) === "V" ? "🏆" : outcome(m) === "D" ? "💥" : "🤝"} {m.team_name} {m.score_us}-{m.score_them} {m.opponent}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4">
        {/* RENCONTRES */}
        <section className="mt-16 grid gap-10 lg:grid-cols-2">
          <div className="min-w-0">
            <SectionTitle kicker="Calendrier" title="Prochains matchs" />
            <div className="space-y-3">
              {upcoming.length ? upcoming.map((m) => <MatchCard key={m.id} m={m} />) : <p className="text-slate-400">Aucun match programmé.</p>}
            </div>
          </div>
          <div className="min-w-0">
            <SectionTitle kicker="Résultats" title="Derniers scores" />
            <div className="space-y-3">
              {results.slice(0, 4).map((m) => <MatchCard key={m.id} m={m} />)}
            </div>
          </div>
        </section>

        {/* ALBUM */}
        <section className="mt-20">
          <SectionTitle kicker="L'album Panini du club" title="Les stars de la saison" />
          <p className="-mt-4 mb-6 text-sm text-slate-400">Survolez (ou touchez) une carte pour la retourner et voir le joueur en mode victoire.</p>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {players.slice(0, 5).map((p, i) => <PaniniCard key={p.id} p={toCard(p, i + 1)} />)}
          </div>
          <div className="mt-6 text-center">
            <Link href="/joueurs" className="btn btn-ghost">Voir tout l&apos;album</Link>
          </div>
        </section>

        {/* ACTUS */}
        <section className="mt-20">
          <SectionTitle kicker="Vie du club" title="Actus" />
          <div className="grid gap-5 md:grid-cols-3">
            {news.map((n) => (
              <article key={n.id} className="card-surface p-6">
                <span className="text-4xl">{n.emoji ?? "🏓"}</span>
                <p className="mt-3 text-xs font-bold uppercase text-club-yellow">{new Date(n.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
                <h3 className="font-display mt-1 text-2xl uppercase">{n.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{n.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative mt-20 overflow-hidden rounded-3xl bg-club-red p-10 text-center">
          <div className="stripes absolute inset-0" />
          <h2 className="font-display relative text-5xl uppercase">Viens taper la balle !</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/90">Deux séances d&apos;essai gratuites, raquettes prêtées. Tous niveaux, dès 7 ans.</p>
          <Link href="/club#horaires" className="btn btn-primary relative mt-6">Horaires &amp; salle</Link>
        </section>
      </div>
    </>
  );
}
