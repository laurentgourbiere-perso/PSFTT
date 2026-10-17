import "server-only";
import { notFound } from "next/navigation";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getTournament, getEvents, eventFill } from "@/lib/tournament";
import { eventRules } from "@/components/tournoi/ui";
import type { RegEvent } from "@/components/tournoi/RegistrationForm";

/** Tournoi visible par l'utilisateur courant (un brouillon n'est visible que du comité). */
export async function loadTournament(slug: string) {
  const t = getTournament(slug);
  const user = await getCurrentUser();
  if (!t || (t.status === "brouillon" && !can.runTournament(user?.role))) notFound();
  return { t, user, staff: can.runTournament(user?.role), scorer: can.scoreTournament(user?.role) };
}

/** Pages de gestion : réservées au comité. */
export async function loadTournamentStaff(slug: string) {
  const user = await requireUser("bureau");
  const t = getTournament(slug);
  if (!t) notFound();
  return { t, user };
}

/** Tableaux proposés au formulaire d'inscription. */
export function regEvents(tournamentId: number): RegEvent[] {
  return getEvents(tournamentId).map((e) => ({
    id: e.id, name: e.name, is_double: e.is_double, rules: eventRules(e), open: e.status === "inscriptions",
    full: e.capacity != null && eventFill(e.id) >= e.capacity,
    min_points: e.min_points, max_points: e.max_points, min_birth_year: e.min_birth_year, start_time: e.start_time,
  }));
}
