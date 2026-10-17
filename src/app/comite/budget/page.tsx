import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteBudgetEntry } from "@/app/actions/comite";
import { BudgetForm } from "@/components/forms/BudgetForm";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata = { title: "Budget" };

type Entry = { id: number; date: string; label: string; category: string; amount: number };
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function currentSeason() {
  const d = new Date();
  const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  await requireUser("bureau");
  const seasons = (db.prepare("SELECT DISTINCT season FROM budget_entries ORDER BY season DESC").all() as { season: string }[]).map((s) => s.season);
  const { saison } = await searchParams;
  const season = saison && /^\d{4}-\d{4}$/.test(saison) ? saison : currentSeason();
  if (!seasons.includes(season)) seasons.unshift(season);
  const entries = db.prepare("SELECT * FROM budget_entries WHERE season = ? ORDER BY date DESC, id DESC").all(season) as Entry[];

  const income = entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const expense = -entries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
  const byCat = new Map<string, { in: number; out: number }>();
  for (const e of entries) {
    const c = byCat.get(e.category) ?? { in: 0, out: 0 };
    if (e.amount > 0) c.in += e.amount; else c.out -= e.amount;
    byCat.set(e.category, c);
  }
  const cats = [...byCat.entries()].sort((a, b) => b[1].in + b[1].out - (a[1].in + a[1].out));
  const max = Math.max(1, ...cats.map(([, c]) => Math.max(c.in, c.out)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle kicker="Trésorerie" title={`Budget ${season}`} />
        <div className="mb-6 flex gap-2">
          {seasons.map((s) => (
            <Link key={s} href={`?saison=${s}`} className={`rounded-full px-3 py-1 text-sm font-bold ${s === season ? "bg-club-yellow text-club-navy" : "bg-white/10"}`}>{s}</Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Recettes" value={eur(income)} className="text-emerald-300" />
        <Kpi label="Dépenses" value={eur(expense)} className="text-red-300" />
        <Kpi label="Solde" value={eur(income - expense)} className={income - expense >= 0 ? "text-club-yellow" : "text-red-400"} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <section className="card-surface p-5">
          <p className="font-display text-2xl uppercase">Par catégorie</p>
          <div className="mt-2 flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-emerald-400" /> Recettes</span>
            <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-red-400" /> Dépenses</span>
          </div>
          <ul className="mt-4 space-y-3">
            {cats.map(([name, c]) => (
              <li key={name}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{name}</span><span className="text-slate-400">{eur(c.in - c.out)}</span></div>
                {c.in > 0 && <div className="mt-1 h-2 rounded-full bg-emerald-400" style={{ width: `${(c.in / max) * 100}%` }} title={eur(c.in)} />}
                {c.out > 0 && <div className="mt-1 h-2 rounded-full bg-red-400" style={{ width: `${(c.out / max) * 100}%` }} title={eur(c.out)} />}
              </li>
            ))}
            {cats.length === 0 && <li className="text-sm text-slate-400">Aucune écriture pour cette saison.</li>}
          </ul>
        </section>

        <section className="space-y-4">
          <BudgetForm season={season} />
          <div className="card-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr><th className="p-3">Date</th><th>Libellé</th><th>Catégorie</th><th className="text-right">Montant</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="p-3 whitespace-nowrap text-slate-400">{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                    <td className="font-semibold">{e.label}</td>
                    <td className="text-slate-400">{e.category}</td>
                    <td className={`text-right font-bold tabular-nums ${e.amount > 0 ? "text-emerald-300" : "text-red-300"}`}>{eur(e.amount)}</td>
                    <td className="px-3 text-right">
                      <form action={deleteBudgetEntry}><input type="hidden" name="id" value={e.id} /><button className="text-slate-500 hover:text-club-red" title="Supprimer">✕</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className={`font-display text-4xl tabular-nums ${className}`}>{value}</p>
    </div>
  );
}
