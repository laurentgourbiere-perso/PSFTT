import { notFound } from "next/navigation";
import { CheckCircle2, CreditCard } from "lucide-react";
import { loadTournament } from "../../load";
import { db } from "@/lib/db";
import { eur, PAYMENT_METHODS, EVENT_STATUS, type TPlayer } from "@/lib/tournament";
import { payOnline, cancelEntryByPlayer } from "@/app/actions/tournoi";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma réservation", robots: { index: false } };

export default async function ReservationPage({ params, searchParams }: { params: Promise<{ slug: string; ref: string }>; searchParams: Promise<{ paye?: string }> }) {
  const { slug, ref } = await params;
  const { paye } = await searchParams;
  const { t } = await loadTournament(slug);
  const p = db.prepare("SELECT * FROM tournament_players WHERE ref = ? AND tournament_id = ?").get(ref, t.id) as TPlayer | undefined;
  if (!p) notFound();
  const entries = db.prepare(`
    SELECT e.id, e.status, v.name, v.status ev_status, v.is_double, q.first_name || ' ' || q.last_name partner, r.first_name || ' ' || r.last_name owner
    FROM tournament_entries e JOIN tournament_events v ON v.id = e.event_id
    LEFT JOIN tournament_players q ON q.id = e.partner_id
    LEFT JOIN tournament_players r ON r.id = e.player_id
    WHERE e.player_id = ? OR e.partner_id = ? ORDER BY v.position`).all(p.id, p.id) as { id: number; status: string; name: string; ev_status: keyof typeof EVENT_STATUS; is_double: number; partner: string | null; owner: string }[];
  const due = p.amount_due - p.amount_paid;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {paye && <p className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-3 font-semibold text-emerald-200"><CheckCircle2 className="h-5 w-5" />Paiement reçu, merci !</p>}
      <div className="card-surface p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-club-red">Réservation confirmée</p>
        <h2 className="font-display text-4xl uppercase">{p.first_name} {p.last_name}</h2>
        <p className="mt-1 text-sm text-slate-400">Code de réservation <span className="rounded bg-white/10 px-2 py-0.5 font-mono font-bold text-club-yellow">{p.ref}</span> · gardez ce lien pour retrouver votre inscription.</p>

        <ul className="mt-6 divide-y divide-white/10">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <span className="flex-1">
                <span className="font-bold">{e.name}</span>
                {e.is_double ? <span className="ml-2 text-sm text-slate-400">avec {e.partner === `${p.first_name} ${p.last_name}` ? e.owner : e.partner}</span> : null}
                {e.status === "attente" && <span className="ml-2 rounded bg-amber-400/20 px-2 text-xs font-bold text-amber-200">liste d&apos;attente</span>}
              </span>
              <span className="text-xs uppercase text-slate-400">{EVENT_STATUS[e.ev_status]}</span>
              {e.ev_status === "inscriptions" && (
                <form action={cancelEntryByPlayer}>
                  <input type="hidden" name="ref" value={p.ref} /><input type="hidden" name="entry" value={e.id} />
                  <button className="text-xs text-slate-400 underline hover:text-club-red">Me désinscrire</button>
                </form>
              )}
            </li>
          ))}
          {entries.length === 0 && <li className="py-3 text-slate-400">Aucun tableau.</li>}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-white/5 p-4">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">{due > 0 ? "Reste à payer" : "Réglé"}</p>
            <p className="font-display text-4xl tabular-nums text-club-yellow">{eur(Math.max(0, due) || p.amount_paid)}</p>
            {p.payment_method && <p className="text-xs text-slate-400">{PAYMENT_METHODS[p.payment_method]} · {p.paid_at && new Date(p.paid_at + "Z").toLocaleDateString("fr-FR")}</p>}
          </div>
          {due > 0 && (
            <div className="ml-auto text-right">
              <form action={payOnline}>
                <input type="hidden" name="ref" value={p.ref} />
                <button className="btn btn-primary"><CreditCard className="h-4 w-4" />Payer {eur(due)} en ligne</button>
              </form>
              <p className="mt-2 text-xs text-slate-400">ou sur place au pointage (espèces, chèque, CB)</p>
            </div>
          )}
        </div>
        <p className="mt-4 rounded-xl border border-club-yellow/30 bg-club-yellow/10 p-3 text-xs text-club-yellow">
          🔌 Prototype : le paiement en ligne est simulé. En production il passera par HelloAsso (gratuit pour les associations) ou Stripe.
        </p>
        {t.checkin_time && <p className="mt-4 text-sm text-slate-300">Le jour J, présentez-vous au pointage à partir de {t.checkin_time.replace(":", "h")} : les joueurs non pointés ne sont pas retenus au tirage au sort.</p>}
      </div>
    </div>
  );
}
