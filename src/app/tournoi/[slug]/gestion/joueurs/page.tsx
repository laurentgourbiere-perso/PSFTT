import Link from "next/link";
import { Check, Search, UserPlus } from "lucide-react";
import { loadTournamentStaff, regEvents } from "../../load";
import { db } from "@/lib/db";
import { eur, PAYMENT_METHODS, type TPlayer } from "@/lib/tournament";
import { toggleCheckIn, recordPayment, withdrawEntry, deletePlayer } from "@/app/actions/tournoi";
import { GestionNav } from "@/components/tournoi/GestionNav";
import { RegistrationForm } from "@/components/tournoi/RegistrationForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pointage et paiements" };

type Row = TPlayer & { events: string | null };

export default async function JoueursPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; f?: string }> }) {
  const { slug } = await params;
  const { q = "", f = "" } = await searchParams;
  const { t } = await loadTournamentStaff(slug);
  const filter = f === "absents" ? "AND p.checked_in = 0" : f === "impayes" ? "AND p.amount_paid < p.amount_due AND IFNULL(p.payment_method, '') != 'offert'" : "";
  const like = `%${q.trim()}%`;
  const players = db.prepare(`
    SELECT p.*, (SELECT json_group_array(json_object('id', e.id, 'name', v.name, 'status', e.status, 'open', v.status = 'inscriptions'))
                 FROM tournament_entries e JOIN tournament_events v ON v.id = e.event_id
                 WHERE e.player_id = p.id OR e.partner_id = p.id) events
    FROM tournament_players p
    WHERE p.tournament_id = ? ${filter} AND (p.first_name || ' ' || p.last_name LIKE ? OR p.last_name || ' ' || p.first_name LIKE ? OR IFNULL(p.club, '') LIKE ? OR p.ref LIKE ?)
    ORDER BY p.last_name COLLATE NOCASE, p.first_name`).all(t.id, like, like, like, like) as Row[];

  const filters = [["", "Tous"], ["absents", "Non pointés"], ["impayes", "Non payés"]];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <GestionNav slug={t.slug} active="/joueurs" />

      <details className="card-surface mb-6 p-5" open={players.length === 0 && !q && !f}>
        <summary className="flex cursor-pointer items-center gap-2 font-display text-2xl uppercase"><UserPlus className="h-5 w-5 text-club-yellow" />Inscription sur place</summary>
        <div className="mt-4"><RegistrationForm tournamentId={t.id} events={regEvents(t.id)} prices={t} source="gestion" /></div>
      </details>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Nom, club ou code de réservation" className="input !pl-9" autoFocus />
          {f && <input type="hidden" name="f" value={f} />}
        </form>
        {filters.map(([k, label]) => (
          <Link key={k} href={`?${new URLSearchParams({ ...(q && { q }), ...(k && { f: k }) })}`} className={`rounded-full px-3 py-1.5 text-sm font-bold ${f === k ? "bg-club-yellow text-club-navy" : "bg-white/10"}`}>{label}</Link>
        ))}
        <span className="text-sm text-slate-400">{players.length} joueur(s)</span>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr><th className="p-3">Présent</th><th>Joueur</th><th>Tableaux</th><th className="text-right">À payer</th><th className="px-3">Paiement</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {players.map((p) => {
              const evs = JSON.parse(p.events ?? "[]") as { id: number; name: string; status: string; open: number }[];
              const paid = p.payment_method != null && p.amount_paid >= p.amount_due;
              return (
                <tr key={p.id} className={p.checked_in ? "" : "opacity-70"}>
                  <td className="p-3">
                    <form action={toggleCheckIn}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 ${p.checked_in ? "border-emerald-400 bg-emerald-400 text-club-navy" : "border-white/30 hover:border-club-yellow"}`} title={p.checked_in ? "Annuler le pointage" : "Pointer le joueur"}>
                        {p.checked_in ? <Check className="h-5 w-5" /> : null}
                      </button>
                    </form>
                  </td>
                  <td className="py-2">
                    <p className="font-bold">{p.last_name.toUpperCase()} {p.first_name}</p>
                    <p className="text-xs text-slate-400">{p.club ?? "Non licencié"} · {p.points} pts{p.birth_year ? ` · ${p.birth_year}` : ""} · <span className="font-mono">{p.ref}</span></p>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {evs.map((e) => (
                        <form key={e.id} action={withdrawEntry} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${e.status === "attente" ? "bg-amber-400/20 text-amber-200" : e.status === "forfait" ? "bg-white/5 text-slate-500 line-through" : "bg-white/10"}`}>
                          <input type="hidden" name="id" value={e.id} />
                          {e.name}{e.status === "attente" && " (attente)"}
                          {e.open ? <button className="text-slate-500 hover:text-club-red" title="Retirer de ce tableau">✕</button> : null}
                        </form>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 text-right font-bold tabular-nums">{eur(p.amount_due)}</td>
                  <td className="px-3 py-2">
                    {paid || p.payment_method === "offert" ? (
                      <form action={recordPayment} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-200">✓ {PAYMENT_METHODS[p.payment_method!]}</span>
                        <input type="hidden" name="method" value="annuler" />
                        <button className="text-xs text-slate-500 hover:text-club-red">annuler</button>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        {p.amount_paid > 0 && <span className="text-xs text-amber-200">{eur(p.amount_paid)} reçus ·</span>}
                        {(["especes", "cheque", "cb", "offert"] as const).map((k) => (
                          <form key={k} action={recordPayment}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="method" value={k} />
                            <button className="rounded-md bg-white/10 px-2 py-1 text-xs font-bold hover:bg-club-yellow hover:text-club-navy">{PAYMENT_METHODS[k]}</button>
                          </form>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="pr-3 text-right">
                    <form action={deletePlayer}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-slate-600 hover:text-club-red" title="Supprimer le joueur et ses inscriptions">🗑</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {players.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400">Aucun joueur.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
