import "server-only";
import { db } from "./db";

export type Tournament = {
  id: number; name: string; date: string; venue: string | null; start_time: string | null;
  sport: string; court_label: string; courts_count: number; max_players: number | null; max_events: number;
  price_1: number; price_2: number; price_double: number;
  status: "inscriptions" | "en_cours" | "termine"; created_at: string;
};

export type TEvent = {
  id: number; tournament_id: number; name: string; position: number; is_double: number; handicap: number;
  min_points: number | null; max_points: number | null; min_birth_year: number | null; max_birth_year: number | null;
  capacity: number | null; format: "poules" | "ko"; group_size: number; qualifiers: number; best_of: number;
  start_time: string | null; status: "inscriptions" | "poules" | "tableau" | "termine";
};

export type Player = {
  id: number; tournament_id: number; first_name: string; last_name: string; club: string | null; licence: string | null;
  points: number; birth_year: number | null; phone: string | null; amount_due: number; amount_paid: number;
  payment_method: string | null; checked_in: number; created_at: string;
};

/** Remplissage d'un tableau, ce que l'on affiche partout (bureau des inscriptions, écran de la salle). */
export type EventFill = TEvent & { registered: number; waiting: number; free: number | null; state: "libre" | "presque" | "complet" | "illimite" };

export const PAYMENT_METHODS: Record<string, string> = { especes: "Espèces", cheque: "Chèque", cb: "Carte", offert: "Offert" };
export const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

export function listTournaments() {
  return db.prepare("SELECT * FROM tournaments ORDER BY date DESC, id DESC").all() as Tournament[];
}
export function getTournament(id: number) {
  return db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id) as Tournament | undefined;
}
export function getEvents(tournamentId: number) {
  return db.prepare("SELECT * FROM events WHERE tournament_id = ? ORDER BY position, id").all(tournamentId) as TEvent[];
}
export function getEvent(id: number) {
  return db.prepare("SELECT * FROM events WHERE id = ?").get(id) as TEvent | undefined;
}

export function eventFills(tournamentId: number): EventFill[] {
  const counts = new Map(
    (db.prepare(`SELECT e.event_id, SUM(e.status = 'inscrit') reg, SUM(e.status = 'attente') wait
      FROM entries e JOIN events v ON v.id = e.event_id WHERE v.tournament_id = ? GROUP BY e.event_id`).all(tournamentId) as { event_id: number; reg: number; wait: number }[])
      .map((r) => [r.event_id, r]),
  );
  return getEvents(tournamentId).map((ev) => {
    const registered = counts.get(ev.id)?.reg ?? 0;
    const waiting = counts.get(ev.id)?.wait ?? 0;
    const free = ev.capacity == null ? null : Math.max(0, ev.capacity - registered);
    const state = free == null ? "illimite" : free === 0 ? "complet" : free <= Math.max(2, Math.ceil(ev.capacity! * 0.15)) ? "presque" : "libre";
    return { ...ev, registered, waiting, free, state };
  });
}

export function playerCount(tournamentId: number) {
  return (db.prepare("SELECT COUNT(*) n FROM players WHERE tournament_id = ?").get(tournamentId) as { n: number }).n;
}

/** Places restantes dans la salle (limite globale), null si aucune limite. */
export function hallFree(t: Tournament) {
  return t.max_players == null ? null : Math.max(0, t.max_players - playerCount(t.id));
}

// ---------------------------------------------------------------------------
// Règles d'inscription
// ---------------------------------------------------------------------------

export function ineligibility(ev: TEvent, p: { points: number; birth_year: number | null }) {
  if (ev.max_points != null && p.points > ev.max_points) return `réservé aux ${ev.max_points} pts maximum`;
  if (ev.min_points != null && p.points < ev.min_points) return `réservé aux ${ev.min_points} pts minimum`;
  if (ev.min_birth_year != null && (p.birth_year == null || p.birth_year < ev.min_birth_year)) return `réservé aux joueurs nés en ${ev.min_birth_year} ou après`;
  if (ev.max_birth_year != null && (p.birth_year == null || p.birth_year > ev.max_birth_year)) return `réservé aux joueurs nés en ${ev.max_birth_year} ou avant`;
  return null;
}

export function priceFor(t: Tournament, singles: number, doubles: number) {
  const s = singles === 0 ? 0 : singles === 1 ? t.price_1 : t.price_2 + (singles - 2) * t.price_1;
  return s + doubles * t.price_double;
}

export function refreshDue(t: Tournament, playerId: number) {
  const rows = db.prepare(`SELECT v.is_double FROM entries e JOIN events v ON v.id = e.event_id
    WHERE (e.player_id = ? OR e.partner_id = ?) AND e.status != 'forfait'`).all(playerId, playerId) as { is_double: number }[];
  const doubles = rows.filter((r) => r.is_double).length;
  db.prepare("UPDATE players SET amount_due = ? WHERE id = ?").run(priceFor(t, rows.length - doubles, doubles), playerId);
}

/** Place libérée : le premier de la liste d'attente prend la place. */
export function promoteWaiting(eventId: number) {
  const ev = getEvent(eventId)!;
  if (ev.capacity == null) return;
  const reg = (db.prepare("SELECT COUNT(*) n FROM entries WHERE event_id = ? AND status = 'inscrit'").get(eventId) as { n: number }).n;
  if (reg >= ev.capacity) return;
  const next = db.prepare("SELECT id FROM entries WHERE event_id = ? AND status = 'attente' ORDER BY id LIMIT 1").get(eventId) as { id: number } | undefined;
  if (next) db.prepare("UPDATE entries SET status = 'inscrit' WHERE id = ?").run(next.id);
}
