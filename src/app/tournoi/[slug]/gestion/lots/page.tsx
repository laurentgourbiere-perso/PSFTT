import { Dices, Wand2 } from "lucide-react";
import { loadTournamentStaff } from "../../load";
import { getEvents, getPrizes, entriesById, rankLabel, eur } from "@/lib/tournament";
import { deletePrize, togglePrizeHanded, awardPrizesAction, drawRaffleAction } from "@/app/actions/tournoi";
import { GestionNav } from "@/components/tournoi/GestionNav";
import { PrizeForm } from "@/components/tournoi/StaffForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lots" };

export default async function LotsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await loadTournamentStaff(slug);
  const events = getEvents(t.id);
  const prizes = getPrizes(t.id);
  const entries = entriesById(t.id);
  const total = prizes.reduce((s, p) => s + (p.value ?? 0), 0);
  const handed = prizes.filter((p) => p.handed_at).length;
  const groups = [...events.map((e) => ({ key: e.id, title: e.name })), { key: null, title: "Tombola" }];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <GestionNav slug={t.slug} active="/lots" />
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <p className="text-sm text-slate-300"><b className="text-club-yellow">{prizes.length}</b> lots · valeur {eur(total)} · <b className="text-club-yellow">{handed}</b> remis</p>
        <form action={awardPrizesAction} className="ml-auto">
          <input type="hidden" name="id" value={t.id} />
          <button className="btn btn-ghost !py-2 !text-xs"><Wand2 className="h-4 w-4" />Attribuer d&apos;après les résultats</button>
        </form>
      </div>

      <div className="card-surface mb-8 p-5">
        <p className="mb-3 font-display text-2xl uppercase">Ajouter un lot</p>
        <PrizeForm tournamentId={t.id} events={events} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((g) => {
          const list = prizes.filter((p) => p.event_id === g.key);
          if (!list.length && g.key !== null) return null;
          return (
            <section key={g.key ?? "tombola"} className="card-surface p-5">
              <p className="mb-3 font-display text-2xl uppercase">{g.title}</p>
              <ul className="divide-y divide-white/5 text-sm">
                {list.map((p) => {
                  const winner = p.winner_entry ? entries.get(p.winner_entry)?.name : p.raffle_name;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                      {p.rank && <span className="w-28 text-xs font-bold uppercase text-slate-400">{rankLabel(p.rank)}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{p.label}</span>
                        <span className="text-xs text-slate-400">{p.value ? ` · ${eur(p.value)}` : ""}{p.sponsor ? ` · ${p.sponsor}` : ""}</span>
                        {winner && <span className="block text-xs font-bold text-club-yellow">→ {winner}</span>}
                      </span>
                      {g.key === null && (
                        <form action={drawRaffleAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-bold hover:bg-club-yellow hover:text-club-navy"><Dices className="h-3 w-3" />{p.winner_player ? "Nouveau tirage" : "Tirer au sort"}</button>
                        </form>
                      )}
                      {winner && (
                        <form action={togglePrizeHanded}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className={`rounded-md px-2 py-1 text-xs font-bold ${p.handed_at ? "bg-emerald-500 text-club-navy" : "bg-white/10 hover:bg-emerald-500/40"}`}>{p.handed_at ? "✓ Remis" : "Remettre"}</button>
                        </form>
                      )}
                      <form action={deletePrize}><input type="hidden" name="id" value={p.id} /><button className="text-slate-600 hover:text-club-red" title="Supprimer">✕</button></form>
                    </li>
                  );
                })}
                {list.length === 0 && <li className="py-2 text-slate-400">Aucun lot de tombola.</li>}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-slate-500">Tombola : tirage au sort parmi les joueurs pointés, un seul lot de tombola par personne.</p>
    </div>
  );
}
