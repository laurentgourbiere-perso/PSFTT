import { db, audit } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Droit d'accès et à la portabilité (art. 15 et 20 RGPD) : export de toutes les données du compte
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const account = db.prepare("SELECT id, email, first_name, last_name, role, created_at, last_login_at, consent_at FROM users WHERE id = ?").get(user.id);
  const profile = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(user.id);
  const stats = db.prepare("SELECT wins, losses, perfs FROM player_stats WHERE user_id = ?").get(user.id);
  const auditTrail = db.prepare("SELECT action, target, at FROM audit_log WHERE actor_id = ? OR target = ?").all(user.id, `user:${user.id}`);
  audit(user.id, "export_donnees", `user:${user.id}`);
  const body = JSON.stringify({ exported_at: new Date().toISOString(), account, profile, stats, audit: auditTrail }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="psftt-mes-donnees-${user.id}.json"`,
    },
  });
}
