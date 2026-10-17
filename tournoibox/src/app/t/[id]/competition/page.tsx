import Link from "next/link";
import { Users } from "lucide-react";
import { getTournament, eventFills } from "@/lib/tournament";
import { sportOf } from "@/lib/sports";
import { eventView, entriesById, groupPlan, groupLetter } from "@/lib/engine";
import { cancelDraw } from "@/app/actions-competition";
import { DrawForm, SwapForm } from "@/components/DrawForms";
import { GroupCard, Bracket, Podium } from "@/components/Competition";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compétition" };

const STATUS = { inscriptions: "Inscriptions", poules: "Poules", tableau: "Tableau final", termine: "Terminé" } as const;
const STATUS_COLOR = { inscriptions: "bg-white/10 text-muted", poules: "bg-brand/25 text-brand-2", tableau: "bg-amber/20 text-amber", termine: "bg-lime/15 text-lime" } as const;

export default async function CompetitionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  const t = getTournament(Number((await params).id))!;
  const fills = eventFills(t.id);
  const { e } = await searchParams;
  const ev = fills.find((x) => x.id === Number(e)) ?? fills.find((x) => x.status === "poules" || x.status === "tableau") ?? fills[0];
  if (!ev) return <main className="mx-auto max-w-7xl px-4 py-6 text-muted">Aucun tableau : ajoutez-en dans l&apos;onglet Tableaux.</main>;

  const sport = sportOf(t.sport);
  const view = eventView(ev);
  const entries = entriesById(t.id);
  const engaged = view.entries.filter((x) => x.status !== "attente");
  const present = engaged.filter((x) => x.present).length;
  const absents = engaged.length - present;
  const plan = ev.format === "poules" && present > 2 ? groupPlan(present, ev.group_size) : null;
  const locked = view.played > 0;
  const editable = ev.status !== "inscriptions";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-6 flex gap-2 overflow-x-auto">
        {fills.map((x) => (
          <Link key={x.id} href={`?e=${x.id}`} className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold ${x.id === ev.id ? "border-brand bg-brand/15" : "border-line hover:border-brand-2"}`}>
            {x.name}<span className={`chip ${STATUS_COLOR[x.status]}`}>{STATUS[x.status]}</span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <div className="panel p-4">
            <p className="font-display text-2xl font-bold">{ev.name}</p>
            <p className="text-sm text-muted">
              {ev.format === "ko" ? "Élimination directe" : `Poules de ${ev.group_size}, ${ev.qualifiers} sortant(s) par poule, puis tableau`} · {Math.ceil(ev.best_of / 2)} {sport.setLabel}(s) gagnante(s)
            </p>
            {ev.status !== "inscriptions" && (
              <p className="mt-2 text-sm">{view.played} / {view.total} matchs joués</p>
            )}
          </div>

          {!locked && (
            <div className="panel space-y-3 p-4">
              <p className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-muted" />{present} présent(s){absents ? `, ${absents} absent(s)` : ""}{ev.waiting ? `, ${ev.waiting} en attente (non retenus)` : ""}</p>
              {plan && ev.status === "inscriptions" && (
                <p className="text-sm text-muted">Le tirage formera <b className="text-white">{plan.count} poule(s)</b> de {[...new Set(plan.sizes)].sort().join(" ou ")} joueurs.</p>
              )}
              <DrawForm eventId={ev.id} redo={ev.status !== "inscriptions"} absents={absents} />
              {ev.status !== "inscriptions" && (
                <form action={cancelDraw}>
                  <input type="hidden" name="id" value={ev.id} />
                  <button className="w-full text-xs text-muted hover:text-hot">Annuler le tirage et rouvrir les inscriptions</button>
                </form>
              )}
              <p className="text-xs text-muted">
                {ev.format === "ko"
                  ? "Têtes de série 1 et 2 aux deux extrémités du tableau, les suivantes tirées au sort par niveau ; les exempts sont attribués aux meilleurs classés."
                  : "Têtes de série selon le classement, réparties en serpentin ; les autres joueurs sont tirés au sort par chapeaux en séparant les joueurs d'un même club. Au tableau final, deux sortants d'une même poule sont placés dans des moitiés opposées."}
              </p>
            </div>
          )}

          {!locked && view.groups.length > 1 && (
            <div className="panel p-4">
              <SwapForm eventId={ev.id} players={view.groups.flatMap((g) => g.standings.map((s) => ({ id: s.entry.id, label: `${groupLetter(g.no)} · ${s.entry.name}` })))} />
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-8">
          {view.podium.length > 0 && (
            <section className="max-w-xl">
              <p className="mb-2 font-display text-2xl font-bold">Podium</p>
              <Podium podium={view.podium} />
            </section>
          )}
          {view.rounds.length > 0 && (
            <section>
              <p className="mb-2 font-display text-2xl font-bold">Tableau final</p>
              <Bracket rounds={view.rounds} entries={entries} editable={editable} placeholder={sport.example} />
            </section>
          )}
          {view.groups.length > 0 && (
            <section>
              <p className="mb-2 font-display text-2xl font-bold">Poules</p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {view.groups.map((g) => <GroupCard key={g.no} g={g} entries={entries} editable={editable} placeholder={sport.example} qualifiers={ev.qualifiers} />)}
              </div>
            </section>
          )}
          {ev.status === "inscriptions" && (
            <div className="panel p-8 text-center text-muted">
              Pas encore de tirage. Quand les joueurs sont là, lancez le tirage au sort : les inscriptions de ce tableau seront alors fermées.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
