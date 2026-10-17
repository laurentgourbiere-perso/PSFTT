import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES, ROLE_LABELS, ROLE_COLORS, type Role } from "@/lib/roles";
import { updateMember } from "@/app/actions/admin";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata = { title: "Utilisateurs" };

type U = { id: number; email: string; first_name: string; last_name: string; role: Role; created_at: string; last_login_at: string | null; team_id: number | null; points: number | null; public_profile: number; social_sharing: number };

export default async function AdminUsers() {
  const me = await requireUser("admin");
  const users = db.prepare(`SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.created_at, u.last_login_at, p.team_id, p.points, p.public_profile, p.social_sharing
    FROM users u LEFT JOIN profiles p ON p.user_id = u.id ORDER BY u.role = 'visiteur' DESC, u.last_name`).all() as U[];
  const teams = db.prepare("SELECT id, name FROM teams ORDER BY id").all() as { id: number; name: string }[];
  const log = db.prepare(`SELECT l.*, u.first_name FROM audit_log l LEFT JOIN users u ON u.id = l.actor_id ORDER BY l.id DESC LIMIT 15`).all() as { id: number; action: string; target: string | null; at: string; first_name: string | null }[];
  const counts = Object.fromEntries(ROLES.map((r) => [r, users.filter((u) => u.role === r).length]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <SectionTitle kicker="Administration" title="Utilisateurs & droits" />
      <div className="mb-6 flex flex-wrap gap-2">
        {ROLES.map((r) => <span key={r} className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_COLORS[r]}`}>{ROLE_LABELS[r]} · {counts[r]}</span>)}
      </div>
      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr><th className="p-3">Membre</th><th>Rôle</th><th>Équipe</th><th>Points</th><th>Consentements</th><th>Dernière connexion</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3"><p className="font-semibold">{u.first_name} {u.last_name}</p><p className="text-xs text-slate-400">{u.email}</p></td>
                <td colSpan={3}>
                  <form action={updateMember} id={`f${u.id}`} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="input !w-36 !py-1" disabled={u.id === me.id}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    {u.id === me.id && <input type="hidden" name="role" value={u.role} />}
                    <select name="team_id" defaultValue={u.team_id ?? ""} className="input !w-40 !py-1">
                      <option value="">—</option>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input name="points" type="number" min={0} max={4000} defaultValue={u.points ?? ""} className="input !w-24 !py-1" />
                  </form>
                </td>
                <td className="text-xs">{u.public_profile ? "🌍 Public" : "🔒 Privé"}{u.social_sharing ? " · 📣 Réseaux" : ""}</td>
                <td className="text-xs text-slate-400">{u.last_login_at ? new Date(u.last_login_at + "Z").toLocaleString("fr-FR") : "jamais"}</td>
                <td className="px-3"><button form={`f${u.id}`} className="btn btn-primary !px-3 !py-1 !text-xs">OK</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10">
        <p className="font-display text-2xl uppercase">📜 Journal (RGPD)</p>
        <ul className="mt-3 space-y-1 font-mono text-xs text-slate-400">
          {log.map((l) => <li key={l.id}>{new Date(l.at + "Z").toLocaleString("fr-FR")} · {l.first_name ?? "système"} · {l.action} · {l.target}</li>)}
        </ul>
      </section>
    </div>
  );
}
