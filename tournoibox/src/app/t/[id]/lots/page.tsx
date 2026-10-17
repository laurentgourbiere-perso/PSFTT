import Link from "next/link";
import { Gift, Monitor, Ticket, Wand2 } from "lucide-react";
import { getTournament, getEvents, eur } from "@/lib/tournament";
import { entriesById, rankLabel } from "@/lib/engine";
import { getPrizes, rafflePool } from "@/lib/prizes";
import { addStandardPrizes, deletePrize, toggleHanded, cancelRaffleAction } from "@/app/actions-prizes";
import { setScreenMode } from "@/app/actions-screen";
import { PrizeForm, RaffleButton } from "@/components/PrizeForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lots" };

export default async function LotsPage({ params }: { params: Promise<{ id: string }> }) {
  const t = getTournament(Number((await params).id))!;
  const events = getEvents(t.id);
  const prizes = getPrizes(t.id);
  const entries = entriesById(t.id);
  const pool = rafflePool(t.id);
  const total = prizes.reduce((s, p) => s + (p.value ?? 0), 0);
  const awarded = prizes.filter((p) => p.winner_entry || p.winner_player).length;
  const handed = prizes.filter((p) => p.handed_at).length;
  const raffle = prizes.filter((p) => p.event_id == null);
  const eventsWithout = events.filter((e) => !prizes.some((p) => p.event_id === e.id));

  const prizeRow = (p: (typeof prizes)[number]) => {
    const winner = p.winner_entry ? entries.get(p.winner_entry)?.name : p.raffle_name;
    return (
      <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
        {p.rank != null && <span className="w-28 text-xs font-bold uppercase text-muted">{rankLabel(p.rank)}</span>}
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{p.label}</span>
          <span className="text-xs text-muted">{p.value ? ` · ${eur(p.value)}` : ""}{p.sponsor ? ` · offert par ${p.sponsor}` : ""}</span>
          {winner ? <span className="block text-sm font-bold text-lime">→ {winner}</span> : p.event_id != null && <span className="block text-xs text-muted">attribué automatiquement à la fin du tableau</span>}
        </span>
        {p.event_id == null && !p.winner_player && <RaffleButton prizeId={p.id} disabled={!pool.length} />}
        {p.event_id == null && p.winner_player && !p.handed_at && (
          <form action={cancelRaffleAction}><input type="hidden" name="id" value={p.id} />
            <button className="text-xs text-muted hover:text-amber" title="Gagnant absent : remettre le lot en jeu">absent, retirer</button>
          </form>
        )}
        {winner && (
          <form action={toggleHanded}><input type="hidden" name="id" value={p.id} />
            <button className={`chip !py-1 ${p.handed_at ? "bg-lime text-ink" : "bg-white/10 hover:bg-lime/30"}`}>{p.handed_at ? "✓ Remis" : "Remettre"}</button>
          </form>
        )}
        <form action={deletePrize}><input type="hidden" name="id" value={p.id} /><button className="text-muted hover:text-hot" title="Supprimer ce lot">✕</button></form>
      </li>
    );
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <section className="grid gap-3 sm:grid-cols-4">
        {[
          ["Lots", String(prizes.length)],
          ["Valeur", eur(total)],
          ["Attribués", `${awarded} / ${prizes.length}`],
          ["Remis", `${handed} / ${awarded}`],
        ].map(([label, value]) => (
          <div key={label} className="panel p-4"><p className="label">{label}</p><p className="font-display text-4xl font-bold tabular-nums">{value}</p></div>
        ))}
      </section>

      <section className="panel mt-6 p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="flex-1 font-display text-2xl font-bold">Ajouter des lots</p>
          {eventsWithout.length > 0 && (
            <form action={addStandardPrizes}>
              <input type="hidden" name="id" value={t.id} />
              <button className="btn btn-ghost"><Wand2 className="h-4 w-4" />Coupes et médailles pour {eventsWithout.length} tableau(x)</button>
            </form>
          )}
        </div>
        <PrizeForm tournamentId={t.id} events={events} />
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {events.map((ev) => {
          const list = prizes.filter((p) => p.event_id === ev.id);
          return (
            <section key={ev.id} className="panel p-5">
              <p className="mb-2 flex items-center gap-2 font-display text-xl font-bold"><Gift className="h-5 w-5 text-lime" />{ev.name}</p>
              {list.length ? <ul className="divide-y divide-line text-sm">{list.map(prizeRow)}</ul> : <p className="text-sm text-muted">Aucun lot pour ce tableau.</p>}
            </section>
          );
        })}
        <section className="panel p-5 lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <p className="flex flex-1 items-center gap-2 font-display text-xl font-bold"><Ticket className="h-5 w-5 text-brand-2" />Tombola</p>
            <span className="text-xs text-muted">{pool.length} joueur(s) présent(s) encore dans le tirage · un lot par personne</span>
            <form action={setScreenMode}>
              <input type="hidden" name="id" value={t.id} /><input type="hidden" name="mode" value="tombola" />
              <button className="btn btn-ghost !py-1.5 text-xs"><Monitor className="h-4 w-4" />Tombola sur l&apos;écran</button>
            </form>
          </div>
          {raffle.length ? <ul className="divide-y divide-line text-sm">{raffle.map(prizeRow)}</ul> : <p className="text-sm text-muted">Ajoutez des lots « pour la tombola » ci-dessus.</p>}
          <p className="mt-3 text-xs text-muted">Chaque tirage s&apos;affiche en grand sur l&apos;écran de la salle pendant 45 secondes, quel que soit le mode. Voir aussi le <Link href={`/t/${t.id}/palmares`} className="text-brand-2 underline">palmarès</Link>.</p>
        </section>
      </div>
    </main>
  );
}
