import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPlayer, toCard, badges } from "@/lib/players";
import { can } from "@/lib/roles";
import { PaniniCard } from "@/components/PaniniCard";
import { BallAvatar } from "@/components/Avatar";
import { parseAvatar } from "@/lib/avatar";

export const dynamic = "force-dynamic";

export default async function JoueurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const p = getPlayer(Number(id), viewer);
  if (!p) notFound();
  const total = p.wins + p.losses;
  const ratio = total ? Math.round((p.wins / total) * 100) : 0;
  const avatar = parseAvatar(p.avatar);
  const facts: [string, string | null][] = [
    ["Main", p.hand], ["Prise", p.grip === "europeenne" ? "européenne" : p.grip], ["Style", p.play_style], ["Coup fatal", p.favorite_shot],
    ["Bois", p.blade], ["Revêtements", p.rubbers], ["Idole", p.idol],
  ];

  return (
    <div>
      <section className="hero-bg relative overflow-hidden">
        <div className="stripes absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[260px_1fr]">
          <div className="mx-auto w-60"><PaniniCard p={toCard(p)} link={false} /></div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-club-yellow">{p.team_name ?? "Joueur loisir"}</p>
            <h1 className="font-display text-6xl uppercase leading-none sm:text-7xl">{p.first_name}<br />{p.last_name}</h1>
            {p.nickname && <p className="font-display mt-2 text-3xl uppercase text-club-red">« {p.nickname} »</p>}
            {p.motto && <p className="mt-4 text-xl italic text-slate-200">“{p.motto}”</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              {badges(p).map((b) => (
                <span key={b.label} className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">{b.icon} {b.label}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
        <div className="card-surface p-6 md:col-span-2">
          <div className="grid grid-cols-4 gap-3 text-center">
            {[{ v: p.points ?? "-", l: "Points" }, { v: p.wins, l: "Victoires" }, { v: p.losses, l: "Défaites" }, { v: `${ratio}%`, l: "Réussite" }].map((s) => (
              <div key={s.l} className="rounded-2xl bg-black/25 p-4">
                <p className="font-display text-4xl text-club-yellow">{s.v}</p>
                <p className="text-xs font-bold uppercase text-slate-400">{s.l}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-club-red/60" title={`${ratio}% de victoires`}>
            <div className="h-full bg-emerald-400" style={{ width: `${ratio}%` }} />
          </div>
          {p.bio && <p className="mt-6 whitespace-pre-line text-slate-200">{p.bio}</p>}
        </div>
        <div className="card-surface p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="overflow-hidden rounded-2xl"><BallAvatar config={avatar ?? undefined} className="h-16 w-16" /></span>
            <p className="font-display text-2xl uppercase">Fiche technique</p>
          </div>
          <dl className="space-y-2 text-sm">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-white/5 pb-1"><dt className="text-slate-400">{k}</dt><dd className="text-right font-semibold capitalize">{v}</dd></div>
            ))}
            {can.seeMembers(viewer?.role) && p.licence_number && (
              <div className="flex justify-between border-b border-white/5 pb-1"><dt className="text-slate-400">Licence</dt><dd className="font-semibold">{p.licence_number}</dd></div>
            )}
            {p.phone && (
              <div className="flex justify-between"><dt className="text-slate-400">Téléphone</dt><dd><a className="font-semibold text-club-yellow" href={`tel:${p.phone}`}>{p.phone}</a></dd></div>
            )}
          </dl>
        </div>
      </div>
      <div className="text-center"><Link href="/joueurs" className="btn btn-ghost">← Retour à l&apos;album</Link></div>
    </div>
  );
}
