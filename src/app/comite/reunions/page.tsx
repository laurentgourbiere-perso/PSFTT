import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/roles";
import { MEETING_KINDS } from "@/lib/meetings";
import { toggleAction } from "@/app/actions/comite";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata = { title: "Réunions" };

type Meeting = { id: number; title: string; date: string; kind: string; visibility: string; n_actions: number; n_open: number };
type Action = { id: number; label: string; owner: string | null; due_date: string | null; done: number; meeting_id: number; title: string };

export default async function ReunionsPage() {
  const user = await requireUser("adherent");
  const editor = can.editMeetings(user.role);
  const where = editor ? "" : "WHERE m.visibility = 'adherents'";
  const meetings = db.prepare(`SELECT m.id, m.title, m.date, m.kind, m.visibility,
      COUNT(a.id) AS n_actions, SUM(CASE WHEN a.done = 0 THEN 1 ELSE 0 END) AS n_open
    FROM meetings m LEFT JOIN meeting_actions a ON a.meeting_id = m.id ${where} GROUP BY m.id ORDER BY m.date DESC`).all() as Meeting[];
  const open = editor
    ? (db.prepare(`SELECT a.*, m.title FROM meeting_actions a JOIN meetings m ON m.id = a.meeting_id WHERE a.done = 0 ORDER BY COALESCE(a.due_date, '9999')`).all() as Action[])
    : [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle kicker="Vie associative" title="Comptes rendus" />
        {editor && <Link href="/comite/reunions/nouveau" className="btn btn-primary mb-6">+ Nouveau compte rendu</Link>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {meetings.map((m) => (
            <Link key={m.id} href={`/comite/reunions/${m.id}`} className="card-surface flex items-center gap-4 p-4 transition hover:border-club-yellow/50">
              <div className="w-16 text-center">
                <p className="font-display text-3xl leading-none text-club-yellow">{new Date(m.date).getDate()}</p>
                <p className="text-xs uppercase text-slate-400">{new Date(m.date).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}</p>
              </div>
              <div className="flex-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${MEETING_KINDS[m.kind]?.color}`}>{MEETING_KINDS[m.kind]?.label}</span>
                {m.visibility === "bureau" && <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">🔒 Comité seulement</span>}
                <p className="mt-1 font-bold">{m.title}</p>
              </div>
              {m.n_actions > 0 && <span className="text-sm text-slate-400">{m.n_actions - (m.n_open ?? 0)}/{m.n_actions} actions</span>}
            </Link>
          ))}
          {meetings.length === 0 && <p className="text-slate-400">Aucun compte rendu publié.</p>}
        </div>

        {editor && (
          <aside className="card-surface h-fit p-5">
            <p className="font-display text-2xl uppercase">🎯 Actions en cours</p>
            <ul className="mt-3 space-y-2">
              {open.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-xl bg-black/20 p-3 text-sm">
                  <form action={toggleAction}><input type="hidden" name="id" value={a.id} /><button className="mt-0.5 h-5 w-5 rounded border-2 border-club-yellow hover:bg-club-yellow" title="Marquer comme fait" /></form>
                  <div className="flex-1">
                    <p className="font-semibold">{a.label}</p>
                    <p className="text-xs text-slate-400">
                      {a.owner ?? "Sans responsable"}
                      {a.due_date && <span className={a.due_date < today ? "font-bold text-red-300" : ""}> · {new Date(a.due_date).toLocaleDateString("fr-FR")}</span>}
                    </p>
                  </div>
                </li>
              ))}
              {open.length === 0 && <li className="text-sm text-slate-400">Tout est fait, bravo ! 🎉</li>}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
