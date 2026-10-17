"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrganizer } from "@/lib/auth";
import { SCREEN_MODES } from "@/lib/screen-modes";
import type { FormState } from "./actions";

const schema = z.object({
  id: z.coerce.number().int(),
  screen_mode: z.enum(Object.keys(SCREEN_MODES) as [string, ...string[]]),
  screen_message: z.string().trim().max(200),
  slide_seconds: z.coerce.number().int().min(5, "5 secondes minimum").max(120),
});

/** Réglages de l'écran de la salle, pilotés depuis le poste organisateur. */
export async function updateScreen(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  db.prepare("UPDATE tournaments SET screen_mode = ?, screen_message = ?, slide_seconds = ? WHERE id = ?").run(d.screen_mode, d.screen_message || null, d.slide_seconds, d.id);
  revalidatePath(`/t/${d.id}`, "layout");
  revalidatePath(`/ecran/${d.id}`);
  return { ok: "Écran mis à jour : il change dans les 3 secondes" };
}

/** Changement de mode en un clic (boutons rapides). */
export async function setScreenMode(form: FormData) {
  await requireOrganizer();
  const mode = String(form.get("mode"));
  if (!(mode in SCREEN_MODES)) return;
  db.prepare("UPDATE tournaments SET screen_mode = ? WHERE id = ?").run(mode, Number(form.get("id")));
  revalidatePath(`/t/${form.get("id")}`, "layout");
}
