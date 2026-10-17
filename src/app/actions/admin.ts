"use server";

import { revalidatePath } from "next/cache";
import { db, audit } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export async function updateMember(form: FormData) {
  const admin = await requireUser("admin");
  const id = Number(form.get("id"));
  const role = String(form.get("role"));
  if (!ROLES.includes(role as (typeof ROLES)[number])) return;
  // Un administrateur ne peut pas se retirer ses propres droits (évite de verrouiller l'application)
  if (id === admin.id && role !== "admin") return;
  const teamId = form.get("team_id") ? Number(form.get("team_id")) : null;
  const pointsRaw = String(form.get("points") ?? "").trim();
  const points = pointsRaw ? Math.max(0, Math.min(4000, Number(pointsRaw) || 0)) : null;
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  db.prepare("UPDATE profiles SET team_id = ?, points = ? WHERE user_id = ?").run(teamId, points, id);
  audit(admin.id, `maj_membre role=${role} equipe=${teamId ?? "-"} points=${points ?? "-"}`, `user:${id}`);
  revalidatePath("/", "layout");
}
