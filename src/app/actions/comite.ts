"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { FormState } from "./auth";

const meetingSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  kind: z.enum(["comite", "bureau", "ag", "capitaines"]),
  attendees: z.string().trim().max(500),
  content: z.string().trim().min(1, "Le compte rendu est vide").max(20000),
  decisions: z.string().trim().max(5000),
  visibility: z.enum(["bureau", "adherents"]),
  actions: z.string().max(5000),
});

export async function createMeeting(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("bureau");
  const parsed = meetingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const id = db.transaction(() => {
    const r = db
      .prepare("INSERT INTO meetings (title, date, kind, attendees, content, decisions, visibility, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(d.title, d.date, d.kind, d.attendees, d.content, d.decisions, d.visibility, user.id);
    // Une action par ligne : « libellé | responsable | AAAA-MM-JJ »
    const ins = db.prepare("INSERT INTO meeting_actions (meeting_id, label, owner, due_date) VALUES (?, ?, ?, ?)");
    for (const line of d.actions.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const [label, owner, due] = line.split("|").map((s) => s.trim());
      ins.run(r.lastInsertRowid, label, owner || null, /^\d{4}-\d{2}-\d{2}$/.test(due ?? "") ? due : null);
    }
    return r.lastInsertRowid;
  })();
  revalidatePath("/comite/reunions");
  redirect(`/comite/reunions/${id}`);
}

export async function toggleAction(form: FormData) {
  await requireUser("bureau");
  db.prepare("UPDATE meeting_actions SET done = 1 - done WHERE id = ?").run(Number(form.get("id")));
  revalidatePath("/comite/reunions", "layout");
}

export async function deleteMeeting(form: FormData) {
  await requireUser("bureau");
  db.prepare("DELETE FROM meetings WHERE id = ?").run(Number(form.get("id")));
  revalidatePath("/comite/reunions");
  redirect("/comite/reunions");
}

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  label: z.string().trim().min(1, "Libellé requis").max(120),
  category: z.string().trim().min(1, "Catégorie requise").max(40),
  kind: z.enum(["recette", "depense"]),
  amount: z.coerce.number().positive("Montant positif attendu").max(1_000_000),
  season: z.string().regex(/^\d{4}-\d{4}$/),
});

export async function addBudgetEntry(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("bureau");
  const parsed = entrySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  db.prepare("INSERT INTO budget_entries (date, label, category, amount, season, author_id) VALUES (?, ?, ?, ?, ?, ?)").run(
    d.date, d.label, d.category, d.kind === "depense" ? -d.amount : d.amount, d.season, user.id,
  );
  revalidatePath("/comite/budget");
  return { ok: "Écriture ajoutée" };
}

export async function deleteBudgetEntry(form: FormData) {
  await requireUser("bureau");
  db.prepare("DELETE FROM budget_entries WHERE id = ?").run(Number(form.get("id")));
  revalidatePath("/comite/budget");
}
