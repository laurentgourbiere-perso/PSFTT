import "server-only";
import { db } from "./db";

export type MatchRow = {
  id: number;
  team_id: number;
  team_name: string;
  division: string | null;
  round: number | null;
  date: string;
  opponent: string;
  home: number;
  score_us: number | null;
  score_them: number | null;
  location: string | null;
};

const BASE = `SELECT m.*, t.name AS team_name, t.division FROM matches m JOIN teams t ON t.id = m.team_id`;

export function upcomingMatches(limit = 6) {
  return db.prepare(`${BASE} WHERE m.score_us IS NULL AND m.date >= date('now') ORDER BY m.date LIMIT ?`).all(limit) as MatchRow[];
}

export function latestResults(limit = 6) {
  return db.prepare(`${BASE} WHERE m.score_us IS NOT NULL ORDER BY m.date DESC LIMIT ?`).all(limit) as MatchRow[];
}

export function teamMatches(teamId: number) {
  return db.prepare(`${BASE} WHERE m.team_id = ? ORDER BY m.date`).all(teamId) as MatchRow[];
}

export function outcome(m: MatchRow) {
  if (m.score_us == null || m.score_them == null) return null;
  return m.score_us > m.score_them ? "V" : m.score_us < m.score_them ? "D" : "N";
}

export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(d).toLocaleDateString("fr-FR", opts);
}
