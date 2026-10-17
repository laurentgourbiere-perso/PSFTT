"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrganizer } from "@/lib/auth";
import { getEvent } from "@/lib/tournament";
import { drawEvent, swapInGroups, getMatch, parseScore, setsWon, setsToWin, closeMatch, reopenMatch, playedCount } from "@/lib/engine";
import type { FormState } from "./actions";

const num = (form: FormData, key = "id") => Number(form.get(key));
const refresh = (tournamentId: number) => revalidatePath(`/t/${tournamentId}`, "layout");

export async function drawAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const ev = getEvent(num(form));
  if (!ev) return { error: "Tableau introuvable" };
  try {
    drawEvent(ev.id, { includeAbsent: form.get("absents") === "on" });
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh(ev.tournament_id);
  return { ok: "Tirage effectué" };
}

/** Annule le tirage et rouvre les inscriptions du tableau (avant le premier match joué). */
export async function cancelDraw(form: FormData) {
  await requireOrganizer();
  const ev = getEvent(num(form));
  if (!ev || playedCount(ev.id) > 0) return;
  db.transaction(() => {
    db.prepare("DELETE FROM matches WHERE event_id = ?").run(ev.id);
    db.prepare("UPDATE entries SET seed = NULL, group_no = NULL, final_rank = NULL, status = CASE WHEN status = 'forfait' THEN 'inscrit' ELSE status END WHERE event_id = ?").run(ev.id);
    db.prepare("UPDATE events SET status = 'inscriptions' WHERE id = ?").run(ev.id);
    const started = (db.prepare("SELECT COUNT(*) n FROM events WHERE tournament_id = ? AND status != 'inscriptions'").get(ev.tournament_id) as { n: number }).n;
    if (!started) db.prepare("UPDATE tournaments SET status = 'inscriptions' WHERE id = ?").run(ev.tournament_id);
  })();
  refresh(ev.tournament_id);
}

export async function swapAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const ev = getEvent(num(form));
  if (!ev) return { error: "Tableau introuvable" };
  try {
    swapInGroups(ev.id, num(form, "a"), num(form, "b"));
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh(ev.tournament_id);
  return { ok: "Joueurs échangés, les rencontres des poules ont été recalculées" };
}

export async function scoreAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const m = getMatch(num(form));
  if (!m || !m.entry_a || !m.entry_b) return { error: "Match introuvable" };
  if (m.status === "termine") return { error: "Ce match a déjà un résultat" };
  const ev = getEvent(m.event_id)!;
  const outcome = String(form.get("outcome") ?? "normal");
  try {
    if (outcome === "forfait_a" || outcome === "forfait_b") {
      closeMatch(m.id, outcome === "forfait_a" ? m.entry_b : m.entry_a, "forfait", []);
    } else {
      const sets = parseScore(String(form.get("score") ?? ""), ev);
      const [a] = setsWon({ sets });
      closeMatch(m.id, a === setsToWin(ev.best_of) ? m.entry_a : m.entry_b, "normal", sets);
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh(ev.tournament_id);
  return { ok: "Résultat enregistré" };
}

export async function reopenAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const m = getMatch(num(form));
  if (!m) return { error: "Match introuvable" };
  try {
    reopenMatch(m.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh(getEvent(m.event_id)!.tournament_id);
  return { ok: "Résultat annulé" };
}
