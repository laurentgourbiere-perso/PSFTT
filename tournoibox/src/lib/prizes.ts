import "server-only";
import crypto from "node:crypto";
import { db } from "./db";

export type Prize = {
  id: number; tournament_id: number; event_id: number | null; rank: number | null; label: string; value: number | null;
  sponsor: string | null; winner_entry: number | null; winner_player: number | null; drawn_at: string | null; handed_at: string | null;
  raffle_name: string | null; raffle_club: string | null;
};

export function getPrizes(tournamentId: number) {
  return db.prepare(`
    SELECT z.*, p.first_name || ' ' || p.last_name raffle_name, p.club raffle_club FROM prizes z
    LEFT JOIN players p ON p.id = z.winner_player
    LEFT JOIN events v ON v.id = z.event_id
    WHERE z.tournament_id = ? ORDER BY z.event_id IS NULL, v.position, z.rank, z.id`).all(tournamentId) as Prize[];
}

/**
 * Attribue les lots sportifs d'après les classements finaux.
 * Les lots d'une même place sont répartis entre les joueurs classés à cette place (deux demi-finalistes…).
 */
export function awardPrizes(tournamentId: number) {
  let n = 0;
  db.transaction(() => {
    const prizes = db.prepare("SELECT id, event_id, rank, winner_entry FROM prizes WHERE tournament_id = ? AND event_id IS NOT NULL AND rank IS NOT NULL ORDER BY event_id, rank, id")
      .all(tournamentId) as { id: number; event_id: number; rank: number; winner_entry: number | null }[];
    for (const p of prizes) {
      if (p.winner_entry) continue;
      const taken = new Set((db.prepare("SELECT winner_entry FROM prizes WHERE event_id = ? AND rank = ? AND winner_entry IS NOT NULL").all(p.event_id, p.rank) as { winner_entry: number }[]).map((r) => r.winner_entry));
      const next = (db.prepare("SELECT id FROM entries WHERE event_id = ? AND final_rank = ? ORDER BY id").all(p.event_id, p.rank) as { id: number }[]).find((e) => !taken.has(e.id));
      if (next) { db.prepare("UPDATE prizes SET winner_entry = ? WHERE id = ?").run(next.id, p.id); n++; }
    }
  })();
  return n;
}

/** Joueurs pouvant encore gagner à la tombola : présents, sans lot de tombola. */
export function rafflePool(tournamentId: number) {
  return db.prepare(`SELECT id, first_name || ' ' || last_name name FROM players WHERE tournament_id = ? AND checked_in = 1
    AND id NOT IN (SELECT winner_player FROM prizes WHERE tournament_id = ? AND winner_player IS NOT NULL) ORDER BY id`)
    .all(tournamentId, tournamentId) as { id: number; name: string }[];
}

/** Tirage au sort d'un lot de tombola parmi les présents (un lot par personne). */
export function drawRaffle(prizeId: number) {
  const prize = db.prepare("SELECT * FROM prizes WHERE id = ?").get(prizeId) as Prize | undefined;
  if (!prize || prize.event_id != null) throw new Error("Lot de tombola introuvable");
  if (prize.winner_player) throw new Error("Ce lot a déjà un gagnant");
  const pool = rafflePool(prize.tournament_id);
  if (!pool.length) throw new Error("Plus aucun joueur présent à tirer au sort");
  const winner = pool[crypto.randomInt(pool.length)];
  db.prepare("UPDATE prizes SET winner_player = ?, drawn_at = ?, handed_at = NULL WHERE id = ?").run(winner.id, new Date().toISOString(), prizeId);
  return winner;
}

/** Gagnant absent ou erreur : le lot repart dans le tirage. */
export function cancelRaffle(prizeId: number) {
  db.prepare("UPDATE prizes SET winner_player = NULL, drawn_at = NULL, handed_at = NULL WHERE id = ? AND event_id IS NULL").run(prizeId);
}

/** Dernier tirage de tombola, s'il date de moins de `seconds` secondes (mis en avant sur l'écran). */
export function recentRaffle(tournamentId: number, seconds = 45) {
  const p = db.prepare(`SELECT z.*, pl.first_name || ' ' || pl.last_name raffle_name, pl.club raffle_club FROM prizes z JOIN players pl ON pl.id = z.winner_player
    WHERE z.tournament_id = ? AND z.drawn_at IS NOT NULL ORDER BY z.drawn_at DESC LIMIT 1`).get(tournamentId) as Prize | undefined;
  return p && Date.now() - Date.parse(p.drawn_at!) < seconds * 1000 ? p : undefined;
}

/** Après une correction de résultat : libère les lots dont le gagnant n'a plus cette place. */
export function releaseStalePrizes(eventId: number) {
  db.prepare(`UPDATE prizes SET winner_entry = NULL, handed_at = NULL WHERE event_id = ? AND winner_entry IS NOT NULL
    AND winner_entry NOT IN (SELECT id FROM entries WHERE event_id = ? AND final_rank = prizes.rank)`).run(eventId, eventId);
}
