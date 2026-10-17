"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { requireOrganizer } from "@/lib/auth";
import { backupNow, backupPath, restoreFrom } from "@/lib/backup";
import type { FormState } from "./actions";

export async function backupAction(_: FormState): Promise<FormState> {
  await requireOrganizer();
  const name = await backupNow("manuelle");
  revalidatePath("/sauvegardes");
  return { ok: `Sauvegarde créée : ${name}` };
}

export async function restoreAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const file = backupPath(String(form.get("name")));
  if (!file) return { error: "Sauvegarde introuvable" };
  try {
    await restoreFrom(file);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  return { ok: "Sauvegarde restaurée. L'état précédent a été sauvegardé juste avant, au cas où." };
}

/** Restaure un fichier .db apporté sur clé USB (ou venant d'un autre PC). */
export async function importAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier .db" };
  if (file.size > 200 * 1024 * 1024) return { error: "Fichier trop volumineux" };
  const tmp = path.join(os.tmpdir(), `tournoibox-import-${Date.now()}.db`);
  fs.writeFileSync(tmp, Buffer.from(await file.arrayBuffer()));
  try {
    await restoreFrom(tmp);
  } catch (e) {
    return { error: (e as Error).message };
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  revalidatePath("/", "layout");
  return { ok: "Base importée. L'état précédent a été sauvegardé juste avant." };
}

/** Arrête TournoiBox (application installée) après une dernière sauvegarde. */
export async function shutdownAction() {
  await requireOrganizer();
  if (process.env.TOURNOIBOX_PACKAGED !== "1") return;
  await backupNow("manuelle").catch(() => {});
  setTimeout(() => process.exit(0), 800);
  redirect("/au-revoir");
}
