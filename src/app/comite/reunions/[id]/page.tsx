import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/roles";
import { MEETING_KINDS } from "@/lib/meetings";
import { toggleAction, deleteMeeting } from "@/app/actions/comite";

type Meeting = { id: number; title: string; date: string; kind: string; attendees: string | null; content: string; decisions: string | null; visibility: string; author: string | null };
type Action = { id: number; label: string; owner: string | null; due_date: string | null; done: number };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("adherent");
  const { id } = await params;
  const editor = can.editMeetings(user.role);
  const m = db.prepare("SELECT m.*, u.first_name AS author FROM meetings m LEFT JOIN users u ON u.id = m.author_id WHERE m.id = ?").get(Number(id)) as Meeting | undefined;
  if (!m || (!editor && m.visibility !== "adherents")) notFound();
  const actions = db.prepare("SELECT * FROM meeting_actions WHERE meeting_id = ? ORDER BY id").all(m.id) as Action[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/comite/reunions" className="text-sm font-bold text-club-yellow">← Tous les comptes rendus</Link>
      <div className="mt-4">
        <span className={`rounded-full px-2 py-0.5 text-xs font-black uppercase ${MEETING_KINDS[m.kind]?.color}`}>{MEETING_KINDS[m.kind]?.label}</span>
        <h1 className="font-display mt-2 text-5xl uppercase">{m.title}</h1>
        <p className="text-slate-400">
          {new Date(m.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {m.author && ` · rédigé par ${m.author}`}
        </p>
        {m.attendees && <p className="mt-1 text-sm text-slate-300">👥 Présents : {m.attendees}</p>}
      </div>

      <article className="card-surface mt-6 whitespace-pre-line p-6 leading-relaxed text-slate-100">{m.content}</article>

      {m.decisions && (
        <section className="mt-6 rounded-2xl border-l-8 border-club-yellow bg-club-yellow/10 p-6">
          <p className="font-display text-2xl uppercase text-club-yellow">✅ Décisions</p>
          <p className="mt-2 whitespace-pre-line">{m.decisions}</p>
        </section>
      )}

      {actions.length > 0 && (
        <section className="card-surface mt-6 p-6">
          <p className="font-display text-2xl uppercase">🎯 Actions</p>
          <ul className="mt-3 space-y-2">
            {actions.map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                {editor ? (
                  <form action={toggleAction}><input type="hidden" name="id" value={a.id} />
                    <button className={`flex h-6 w-6 items-center justify-center rounded border-2 border-club-yellow text-sm font-black ${a.done ? "bg-club-yellow text-club-navy" : ""}`}>{a.done ? "✓" : ""}</button>
                  </form>
                ) : <span>{a.done ? "✅" : "⏳"}</span>}
                <span className={a.done ? "text-slate-500 line-through" : ""}>{a.label}</span>
                <span className="ml-auto text-sm text-slate-400">{a.owner}{a.due_date && ` · ${new Date(a.due_date).toLocaleDateString("fr-FR")}`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editor && (
        <form action={deleteMeeting} className="mt-8 text-right">
          <input type="hidden" name="id" value={m.id} />
          <button className="text-sm text-slate-500 hover:text-club-red">Supprimer ce compte rendu</button>
        </form>
      )}
    </div>
  );
}
