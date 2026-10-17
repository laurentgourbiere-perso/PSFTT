import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { db, audit } from "@/lib/db";
import { getTournament } from "@/lib/tournament";

/** Liste des inscrits au format CSV (Excel, séparateur point-virgule). */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!can.runTournament(user?.role)) return new NextResponse("Accès refusé", { status: 403 });
  const t = getTournament((await params).slug);
  if (!t) return new NextResponse("Introuvable", { status: 404 });
  const rows = db.prepare(`
    SELECT p.last_name, p.first_name, p.club, p.licence, p.points, p.birth_year, p.email, p.phone, p.ref,
      (SELECT group_concat(v.name, ' + ') FROM tournament_entries e JOIN tournament_events v ON v.id = e.event_id WHERE e.player_id = p.id OR e.partner_id = p.id) tableaux,
      p.amount_due, p.amount_paid, p.payment_method, CASE p.checked_in WHEN 1 THEN 'oui' ELSE 'non' END pointe
    FROM tournament_players p WHERE p.tournament_id = ? ORDER BY p.last_name, p.first_name`).all(t.id) as Record<string, unknown>[];
  const header = ["Nom", "Prénom", "Club", "Licence", "Points", "Naissance", "E-mail", "Téléphone", "Réservation", "Tableaux", "Dû", "Payé", "Mode", "Pointé"];
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + [header.join(";"), ...rows.map((r) => Object.values(r).map(cell).join(";"))].join("\r\n");
  audit(user!.id, "tournoi.export_inscrits", `tournoi:${t.id}`);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="inscrits-${t.slug}.csv"` },
  });
}
