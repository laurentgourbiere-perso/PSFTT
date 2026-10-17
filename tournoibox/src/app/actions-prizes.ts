"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrganizer } from "@/lib/auth";
import { getEvents } from "@/lib/tournament";
import { awardPrizes, drawRaffle, cancelRaffle } from "@/lib/prizes";
import type { FormState } from "./actions";

const num = (form: FormData, key = "id") => Number(form.get(key));
const refresh = (tid: number) => { revalidatePath(`/t/${tid}`, "layout"); revalidatePath(`/ecran/${tid}`); };
const prizeTournament = (prizeId: number) => (db.prepare("SELECT tournament_id FROM prizes WHERE id = ?").get(prizeId) as { tournament_id: number } | undefined)?.tournament_id;

const optNum = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());

const prizeSchema = z.object({
  tournament_id: z.coerce.number().int(),
  event_id: optNum(z.coerce.number().int()),
  rank: optNum(z.coerce.number().int().min(1).max(32)),
  label: z.string().trim().min(1, "Décrivez le lot").max(120),
  value: optNum(z.coerce.number().min(0).max(100000)),
  sponsor: z.string().trim().max(80),
  quantity: z.coerce.number().int().min(1).max(50),
});

export async function addPrize(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const parsed = prizeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.event_id && !getEvents(d.tournament_id).some((e) => e.id === d.event_id)) return { error: "Tableau inconnu" };
  const ins = db.prepare("INSERT INTO prizes (tournament_id, event_id, rank, label, value, sponsor) VALUES (?, ?, ?, ?, ?, ?)");
  db.transaction(() => {
    for (let i = 0; i < d.quantity; i++) ins.run(d.tournament_id, d.event_id ?? null, d.event_id ? d.rank ?? 1 : null, d.label, d.value ?? null, d.sponsor || null);
  })();
  awardPrizes(d.tournament_id);
  refresh(d.tournament_id);
  return { ok: d.quantity > 1 ? `${d.quantity} lots ajoutés` : "Lot ajouté" };
}

/** Coupe au vainqueur, médailles au finaliste et aux deux demi-finalistes, pour chaque tableau qui n'a pas encore de lots. */
export async function addStandardPrizes(form: FormData) {
  await requireOrganizer();
  const tid = num(form);
  const ins = db.prepare("INSERT INTO prizes (tournament_id, event_id, rank, label) VALUES (?, ?, ?, ?)");
  db.transaction(() => {
    for (const ev of getEvents(tid)) {
      if (db.prepare("SELECT 1 FROM prizes WHERE event_id = ?").get(ev.id)) continue;
      const pair = ev.is_double ? " (×2 pour la paire)" : "";
      ins.run(tid, ev.id, 1, `Coupe${pair}`);
      ins.run(tid, ev.id, 2, `Médaille d'argent${pair}`);
      // En élimination directe ou avec un tableau final, il y a deux demi-finalistes
      ins.run(tid, ev.id, 3, `Médaille de bronze${pair}`);
      ins.run(tid, ev.id, 3, `Médaille de bronze${pair}`);
    }
  })();
  awardPrizes(tid);
  refresh(tid);
}

export async function deletePrize(form: FormData) {
  await requireOrganizer();
  const tid = prizeTournament(num(form));
  if (!tid) return;
  db.prepare("DELETE FROM prizes WHERE id = ?").run(num(form));
  refresh(tid);
}

export async function toggleHanded(form: FormData) {
  await requireOrganizer();
  const tid = prizeTournament(num(form));
  if (!tid) return;
  db.prepare("UPDATE prizes SET handed_at = CASE WHEN handed_at IS NULL THEN datetime('now') ELSE NULL END WHERE id = ? AND (winner_entry IS NOT NULL OR winner_player IS NOT NULL)").run(num(form));
  refresh(tid);
}

export async function drawRaffleAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const tid = prizeTournament(num(form));
  if (!tid) return { error: "Lot introuvable" };
  try {
    const w = drawRaffle(num(form));
    refresh(tid);
    return { ok: `🎉 ${w.name} !` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function cancelRaffleAction(form: FormData) {
  await requireOrganizer();
  const tid = prizeTournament(num(form));
  if (!tid) return;
  cancelRaffle(num(form));
  refresh(tid);
}
