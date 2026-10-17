"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, audit } from "@/lib/db";
import { requireUser, destroySession } from "@/lib/auth";
import { saveImage, deleteImage } from "@/lib/uploads";
import { AVATAR_OPTIONS } from "@/lib/avatar";
import type { FormState } from "./auth";

const opt = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const profileSchema = z.object({
  nickname: opt(40),
  motto: opt(120),
  bio: opt(800),
  hand: z.enum(["", "droitier", "gaucher"]).transform((v) => v || null),
  grip: z.enum(["", "europeenne", "porte-plume"]).transform((v) => v || null),
  play_style: z.enum(["", "attaquant", "défenseur", "contreur", "lifteur", "polyvalent"]).transform((v) => v || null),
  favorite_shot: opt(60),
  blade: opt(60),
  rubbers: opt(100),
  idol: opt(60),
  licence_number: z.string().trim().regex(/^\d{0,10}$/, "Numéro de licence : chiffres uniquement").transform((v) => v || null),
  phone: z.string().trim().regex(/^[+\d .-]{0,20}$/, "Téléphone invalide").transform((v) => v || null),
});

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  db.prepare(
    `UPDATE profiles SET nickname=@nickname, motto=@motto, bio=@bio, hand=@hand, grip=@grip, play_style=@play_style,
     favorite_shot=@favorite_shot, blade=@blade, rubbers=@rubbers, idol=@idol, licence_number=@licence_number, phone=@phone,
     updated_at=datetime('now') WHERE user_id=@id`,
  ).run({ ...d, id: user.id });
  revalidatePath("/", "layout");
  return { ok: "Profil enregistré 💪" };
}

export async function updatePrivacy(form: FormData) {
  const user = await requireUser();
  const flag = (k: string) => (form.get(k) === "on" ? 1 : 0);
  db.prepare("UPDATE profiles SET public_profile=?, public_photos=?, social_sharing=?, show_phone=?, updated_at=datetime('now') WHERE user_id=?").run(
    flag("public_profile"), flag("public_photos"), flag("social_sharing"), flag("show_phone"), user.id,
  );
  audit(user.id, "maj_consentements", `user:${user.id}`);
  revalidatePath("/", "layout");
}

export async function uploadPhoto(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const kind = form.get("kind") === "victory" ? "photo_victory" : "photo_portrait";
  const res = await saveImage(form.get("photo") as File);
  if (res.error) return { error: res.error };
  const prev = db.prepare(`SELECT ${kind} AS f FROM profiles WHERE user_id = ?`).get(user.id) as { f: string | null };
  db.prepare(`UPDATE profiles SET ${kind} = ?, updated_at=datetime('now') WHERE user_id = ?`).run(res.id, user.id);
  deleteImage(prev.f);
  revalidatePath("/", "layout");
  return { ok: "Photo mise à jour 📸" };
}

export async function removePhoto(form: FormData) {
  const user = await requireUser();
  const kind = form.get("kind") === "victory" ? "photo_victory" : "photo_portrait";
  const prev = db.prepare(`SELECT ${kind} AS f FROM profiles WHERE user_id = ?`).get(user.id) as { f: string | null };
  db.prepare(`UPDATE profiles SET ${kind} = NULL WHERE user_id = ?`).run(user.id);
  deleteImage(prev.f);
  revalidatePath("/", "layout");
}

const avatarSchema = z.object({
  ball: z.enum(AVATAR_OPTIONS.ball),
  bg: z.enum(AVATAR_OPTIONS.bg),
  eyes: z.enum(AVATAR_OPTIONS.eyes),
  mouth: z.enum(AVATAR_OPTIONS.mouth),
  hat: z.enum(AVATAR_OPTIONS.hat),
});

export async function saveAvatar(config: unknown) {
  const user = await requireUser();
  const parsed = avatarSchema.safeParse(config);
  if (!parsed.success) return;
  db.prepare("UPDATE profiles SET avatar = ? WHERE user_id = ?").run(JSON.stringify(parsed.data), user.id);
  revalidatePath("/", "layout");
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 10 || !/[0-9]/.test(next) || !/[A-Za-z]/.test(next)) {
    return { error: "Nouveau mot de passe : 10 caractères minimum, lettres et chiffres" };
  }
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string };
  if (!(await bcrypt.compare(current, row.password_hash))) return { error: "Mot de passe actuel incorrect" };
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await bcrypt.hash(next, 12), user.id);
  return { ok: "Mot de passe modifié 🔒" };
}

// Droit à l'effacement (art. 17 RGPD) : suppression du compte, du profil et des photos
export async function deleteAccount(form: FormData) {
  const user = await requireUser();
  if (form.get("confirm") !== "SUPPRIMER") return;
  const p = db.prepare("SELECT photo_portrait, photo_victory FROM profiles WHERE user_id = ?").get(user.id) as
    | { photo_portrait: string | null; photo_victory: string | null }
    | undefined;
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  deleteImage(p?.photo_portrait);
  deleteImage(p?.photo_victory);
  audit(null, "suppression_compte", `user:${user.id}`);
  await destroySession();
  redirect("/?compte-supprime=1");
}
