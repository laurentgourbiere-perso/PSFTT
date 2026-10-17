"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

const DUMMY_HASH = bcrypt.hashSync("psftt-dummy", 10);

export type FormState = { error?: string; ok?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(parsed.data.email) as
    | { id: number; password_hash: string }
    | undefined;
  // Comparaison même si l'utilisateur n'existe pas, pour ne pas révéler les comptes existants
  const ok = await bcrypt.compare(parsed.data.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "E-mail ou mot de passe incorrect" };
  await createSession(user.id);
  redirect("/espace");
}

const registerSchema = z
  .object({
    first_name: z.string().trim().min(1, "Prénom requis").max(60),
    last_name: z.string().trim().min(1, "Nom requis").max(60),
    email: z.string().trim().email("Adresse e-mail invalide"),
    password: z
      .string()
      .min(10, "Le mot de passe doit faire au moins 10 caractères")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
      .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre"),
    confirm: z.string(),
    consent: z.literal("on", { message: "Vous devez accepter la politique de confidentialité" }),
  })
  .refine((d) => d.password === d.confirm, { message: "Les mots de passe ne correspondent pas" });

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(d.email)) {
    return { error: "Un compte existe déjà avec cette adresse" };
  }
  const hash = await bcrypt.hash(d.password, 12);
  const id = db.transaction(() => {
    const r = db
      .prepare("INSERT INTO users (email, password_hash, first_name, last_name, consent_at) VALUES (?, ?, ?, ?, datetime('now'))")
      .run(d.email, hash, d.first_name, d.last_name);
    db.prepare("INSERT INTO profiles (user_id) VALUES (?)").run(r.lastInsertRowid);
    return Number(r.lastInsertRowid);
  })();
  await createSession(id);
  redirect("/profil?bienvenue=1");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
