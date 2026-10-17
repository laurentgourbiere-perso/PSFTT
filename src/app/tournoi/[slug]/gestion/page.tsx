import Link from "next/link";
import { Download, FlaskConical, Copy, PiggyBank } from "lucide-react";
import { loadTournamentStaff } from "../load";
import { db } from "@/lib/db";
import { getEvents, eventFill, freeTables, eur } from "@/lib/tournament";
import { demoRegistrations, demoPlayRound, duplicateTournament, exportToBudget } from "@/app/actions/tournoi";
import { GestionNav } from "@/components/tournoi/GestionNav";
import { StatusPill } from "@/components/tournoi/ui";
import { AutoRefresh } from "@/components/tournoi/AutoRefresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gestion du tournoi" };

export default async function GestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await loadTournamentStaff(slug);
  const s = db.prepare(`SELECT COUNT(*) players, IFNULL(SUM(checked_in), 0) present, IFNULL(SUM(amount_due), 0) due, IFNULL(SUM(amount_paid), 0) paid,
    IFNULL(SUM(CASE WHEN payment_method = 'en_ligne' THEN amount_paid END), 0) online FROM tournament_players WHERE tournament_id = ?`).get(t.id) as { players: number; present: number; due: number; paid: number; online: number };
  const m = db.prepare(`SELECT COUNT(*) total, IFNULL(SUM(m.status = 'termine'), 0) done, IFNULL(SUM(m.status = 'en_cours'), 0) live
    FROM tournament_matches m JOIN tournament_events v ON v.id = m.event_id WHERE v.tournament_id = ? AND IFNULL(m.outcome, '') != 'exempt'`).get(t.id) as { total: number; done: number; live: number };
  const events = getEvents(t.id);
  const busy = t.tables_count - freeTables(t).length;
  const base = `/tournoi/${t.slug}/gestion`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <GestionNav slug={t.slug} active="" />
      <div className="mb-2 flex justify-end"><AutoRefresh seconds={15} /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Joueurs inscrits" value={String(s.players)} sub={`${s.present} pointés`} />
        <Kpi label="Encaissé" value={eur(s.paid)} sub={`sur ${eur(s.due)} · dont ${eur(s.online)} en ligne`} />
        <Kpi label="Matchs joués" value={`${m.done} / ${m.total}`} sub={`${m.live} en cours`} />
        <Kpi label="Tables occupées" value={`${busy} / ${t.tables_count}`} sub={<Link href={`${base}/salle`} className="underline">ouvrir la salle</Link>} />
      </div>

      <section className="mt-8">
        <p className="mb-3 font-display text-2xl uppercase">Tableaux</p>
        <div className="card-surface divide-y divide-white/5">
          {events.map((e) => (
            <Link key={e.id} href={`${base}/tableaux?t=${e.id}`} className="flex items-center gap-3 p-3 hover:bg-white/5">
              <span className="flex-1 font-bold">{e.name}</span>
              <span className="text-sm text-slate-400">{eventFill(e.id)}{e.capacity ? ` / ${e.capacity}` : ""} {e.is_double ? "paires" : "joueurs"}</span>
              {e.start_time && <span className="text-sm text-slate-400">{e.start_time.replace(":", "h")}</span>}
              <StatusPill status={e.status} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <a href={`${base}/export`} className="card-surface flex items-center gap-3 p-4 hover:border-club-yellow">
          <Download className="h-6 w-6 text-club-yellow" /><span><b>Exporter les inscrits</b><br /><span className="text-xs text-slate-400">CSV pour Excel : juge-arbitre, homologation</span></span>
        </a>
        <form action={exportToBudget} className="card-surface p-4">
          <input type="hidden" name="id" value={t.id} />
          <button className="flex w-full items-center gap-3 text-left" disabled={s.paid <= 0}>
            <PiggyBank className="h-6 w-6 text-club-yellow" /><span><b>Reporter au budget</b><br /><span className="text-xs text-slate-400">{eur(s.paid)} en recette « Tournoi »</span></span>
          </button>
        </form>
        <form action={duplicateTournament} className="card-surface p-4">
          <input type="hidden" name="id" value={t.id} />
          <button className="flex w-full items-center gap-3 text-left">
            <Copy className="h-6 w-6 text-club-yellow" /><span><b>Préparer l&apos;édition suivante</b><br /><span className="text-xs text-slate-400">Mêmes tableaux, tarifs et lots, un an plus tard</span></span>
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-dashed border-club-yellow/40 p-5">
        <p className="flex items-center gap-2 font-bold text-club-yellow"><FlaskConical className="h-5 w-5" />Outils de démonstration</p>
        <p className="mt-1 text-sm text-slate-400">Pour présenter le déroulé au comité sans vrais joueurs. À retirer avant la mise en ligne.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <form action={demoRegistrations}><input type="hidden" name="id" value={t.id} /><button className="btn btn-ghost !py-2 !text-xs">+ 40 inscriptions fictives</button></form>
          <form action={demoPlayRound}><input type="hidden" name="id" value={t.id} /><button className="btn btn-ghost !py-2 !text-xs">▶ Jouer les matchs sur les tables</button></form>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="font-display text-4xl tabular-nums text-club-yellow">{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}
