import Link from "next/link";
import { Check, Search, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getTournament, eventFills, hallFree, playerCount, eur, PAYMENT_METHODS, type Player } from "@/lib/tournament";
import { sportOf } from "@/lib/sports";
import { togglePresence, recordPayment, withdrawEntry, deletePlayer } from "@/app/actions";
import { RegistrationDesk } from "@/components/forms";
import { FillCard } from "@/components/FillCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inscriptions" };

type Row = Player & { entries: string };

export default async function InscriptionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; f?: string }> }) {
  const t = getTournament(Number((await params).id))!;
  const { q = "", f = "" } = await searchParams;
  const fills = eventFills(t.id);
  const sport = sportOf(t.sport);
  const free = hallFree(t);
  const total = playerCount(t.id);
  const filter = f === "impayes" ? "AND p.amount_paid < p.amount_due AND IFNULL(p.payment_method, '') != 'offert'" : f === "absents" ? "AND p.checked_in = 0" : "";
  const like = `%${q.trim()}%`;
  const players = db.prepare(`
    SELECT p.*, (SELECT json_group_array(json_object('id', e.id, 'name', v.name, 'status', e.status, 'open', v.status = 'inscriptions',
                   'partner', CASE WHEN e.partner_id IS NULL THEN NULL WHEN e.player_id = p.id THEN (SELECT first_name || ' ' || last_name FROM players WHERE id = e.partner_id)
                                   ELSE (SELECT first_name || ' ' || last_name FROM players WHERE id = e.player_id) END))
                 FROM entries e JOIN events v ON v.id = e.event_id WHERE e.player_id = p.id OR e.partner_id = p.id) entries
    FROM players p
    WHERE p.tournament_id = ? ${filter} AND (p.first_name || ' ' || p.last_name LIKE ? OR p.last_name || ' ' || p.first_name LIKE ? OR IFNULL(p.club, '') LIKE ?)
    ORDER BY p.id DESC`).all(t.id, like, like, like) as Row[];
  const cashed = (db.prepare("SELECT IFNULL(SUM(amount_paid), 0) s, IFNULL(SUM(amount_due), 0) d FROM players WHERE tournament_id = ?").get(t.id) as { s: number; d: number });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel flex flex-col justify-between p-4">
          <p className="label">Dans la salle</p>
          <p className="font-display text-5xl font-bold tabular-nums">{total}{t.max_players ? <span className="text-2xl text-muted"> / {t.max_players}</span> : null}</p>
          <p className="text-xs text-muted">{free == null ? "pas de limite de salle" : free === 0 ? <span className="text-hot">salle complète</span> : `${free} place(s) dans la salle`} · {eur(cashed.s)} encaissés sur {eur(cashed.d)}</p>
        </div>
        {fills.map((ev) => <FillCard key={ev.id} ev={ev} />)}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="panel p-5">
          <p className="mb-4 font-display text-2xl font-bold">Inscrire un joueur</p>
          <RegistrationDesk
            tournamentId={t.id}
            pointsLabel={sport.pointsLabel}
            hallFull={free === 0}
            prices={t}
            events={fills.map((e) => ({
              id: e.id, name: e.name, is_double: e.is_double, open: e.status === "inscriptions", free: e.free, waiting: e.waiting,
              min_points: e.min_points, max_points: e.max_points, min_birth_year: e.min_birth_year, max_birth_year: e.max_birth_year,
            }))}
          />
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <form className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input name="q" defaultValue={q} placeholder="Rechercher un joueur ou un club" className="input !pl-9" />
              {f && <input type="hidden" name="f" value={f} />}
            </form>
            {[["", "Tous"], ["impayes", "À encaisser"], ["absents", "Absents"]].map(([k, label]) => (
              <Link key={k} href={`?${new URLSearchParams({ ...(q && { q }), ...(k && { f: k }) })}`} className={`chip !py-1 !text-xs ${f === k ? "bg-brand text-white" : "bg-white/10"}`}>{label}</Link>
            ))}
          </div>
          <p className="mb-2 flex items-center gap-1 text-xs text-muted"><Users className="h-3 w-3" />{players.length} joueur(s), les derniers inscrits en premier</p>
          <ul className="space-y-2">
            {players.map((p) => {
              const entries = JSON.parse(p.entries ?? "[]") as { id: number; name: string; status: string; open: number; partner: string | null }[];
              const paid = p.payment_method != null && (p.payment_method === "offert" || p.amount_paid >= p.amount_due);
              const locked = entries.some((e) => !e.open);
              return (
                <li key={p.id} className={`panel p-3 ${p.checked_in ? "" : "opacity-60"}`}>
                  <div className="flex items-start gap-3">
                    <form action={togglePresence}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 ${p.checked_in ? "border-lime bg-lime text-ink" : "border-line hover:border-lime"}`} title={p.checked_in ? "Présent (cliquer pour marquer absent)" : "Absent (cliquer pour marquer présent)"}>
                        {p.checked_in ? <Check className="h-5 w-5" /> : null}
                      </button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{p.first_name} {p.last_name.toUpperCase()}</p>
                      <p className="text-xs text-muted">{p.club ?? "Sans club"} · {p.points} {sport.pointsLabel.toLowerCase()}{p.birth_year ? ` · ${p.birth_year}` : ""}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entries.map((e) => (
                          <form key={e.id} action={withdrawEntry} className={`chip ${e.status === "attente" ? "bg-amber/20 text-amber" : "bg-white/10"}`}>
                            <input type="hidden" name="id" value={e.id} />
                            {e.name}{e.partner ? ` (avec ${e.partner})` : ""}{e.status === "attente" ? " · attente" : ""}
                            {e.open ? <button className="text-muted hover:text-hot" title="Retirer de ce tableau">✕</button> : null}
                          </form>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl font-bold tabular-nums">{eur(p.amount_due)}</p>
                      {paid ? (
                        <form action={recordPayment}>
                          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="method" value="annuler" />
                          <button className="chip bg-lime/15 text-lime" title="Annuler le paiement">✓ {PAYMENT_METHODS[p.payment_method!]}</button>
                        </form>
                      ) : p.amount_due > 0 ? (
                        <div className="mt-1 flex justify-end gap-1">
                          {(["especes", "cheque", "cb"] as const).map((m) => (
                            <form key={m} action={recordPayment}>
                              <input type="hidden" name="id" value={p.id} /><input type="hidden" name="method" value={m} />
                              <button className="chip bg-white/10 hover:bg-lime hover:text-ink">{PAYMENT_METHODS[m]}</button>
                            </form>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {!locked && (
                    <form action={deletePlayer} className="mt-1 text-right">
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-[11px] text-muted hover:text-hot">supprimer</button>
                    </form>
                  )}
                </li>
              );
            })}
            {players.length === 0 && <li className="panel p-6 text-center text-muted">Aucun joueur{q ? " trouvé" : " inscrit pour l'instant"}.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
