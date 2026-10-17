import "server-only";
import crypto from "node:crypto";
import { db } from "./db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tournament = {
  id: number; slug: string; name: string; date: string; venue: string | null;
  start_time: string | null; checkin_time: string | null; description: string | null; sponsors: string | null;
  status: "brouillon" | "inscriptions" | "en_cours" | "termine";
  max_events: number; price_1: number; price_2: number; price_double: number; tables_count: number;
};

export type TEvent = {
  id: number; tournament_id: number; name: string; position: number; is_double: number; handicap: number;
  min_points: number | null; max_points: number | null; min_birth_year: number | null; capacity: number | null;
  format: "poules" | "ko"; group_size: number; qualifiers: number; best_of: number; start_time: string | null;
  status: "inscriptions" | "poules" | "tableau" | "termine";
};

export type TPlayer = {
  id: number; tournament_id: number; user_id: number | null; first_name: string; last_name: string;
  email: string | null; phone: string | null; club: string | null; licence: string | null; points: number;
  birth_year: number | null; ref: string; amount_due: number; amount_paid: number; payment_method: string | null;
  paid_at: string | null; checked_in: number; registered_by: number | null; created_at: string;
};

export type Entry = {
  id: number; event_id: number; player_id: number; partner_id: number | null; status: "inscrit" | "attente" | "forfait";
  seed: number | null; group_no: number | null; final_rank: number | null;
  name: string; club: string | null; points: number; present: boolean;
};

export type TMatch = {
  id: number; event_id: number; stage: "poule" | "ko"; group_no: number | null; round: number | null; slot: number;
  entry_a: number | null; entry_b: number | null; handicap_a: number; handicap_b: number; sets: number[][];
  winner: number | null; status: "attente" | "pret" | "appele" | "en_cours" | "termine"; outcome: string | null;
  table_no: number | null; next_match: number | null; next_side: "a" | "b" | null;
  ready_at: string | null; called_at: string | null; started_at: string | null; finished_at: string | null;
};

export const EVENT_STATUS: Record<TEvent["status"], string> = {
  inscriptions: "Inscriptions", poules: "Poules", tableau: "Tableau final", termine: "Terminé",
};
export const TOURNAMENT_STATUS: Record<Tournament["status"], string> = {
  brouillon: "Brouillon", inscriptions: "Inscriptions ouvertes", en_cours: "En cours", termine: "Terminé",
};
export const PAYMENT_METHODS: Record<string, string> = {
  en_ligne: "En ligne", especes: "Espèces", cheque: "Chèque", cb: "Carte bancaire", offert: "Offert",
};

export const roundLabel = (round: number | null) =>
  round === 2 ? "Finale" : round === 4 ? "Demi-finales" : round === 8 ? "Quarts de finale" : round ? `1/${round / 2} de finale` : "";
export const rankLabel = (rank: number | null) =>
  rank === 1 ? "Vainqueur" : rank === 2 ? "Finaliste" : rank === 3 ? "Demi-finaliste" : rank ? `${rank}e` : "";
export const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

export function getTournament(slug: string) {
  return db.prepare("SELECT * FROM tournaments WHERE slug = ?").get(slug) as Tournament | undefined;
}
export function getTournamentById(id: number) {
  return db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id) as Tournament | undefined;
}
export function listTournaments() {
  return db.prepare("SELECT * FROM tournaments WHERE status != 'brouillon' ORDER BY date DESC").all() as Tournament[];
}
export function getEvents(tournamentId: number) {
  return db.prepare("SELECT * FROM tournament_events WHERE tournament_id = ? ORDER BY position, id").all(tournamentId) as TEvent[];
}
export function getEvent(id: number) {
  return db.prepare("SELECT * FROM tournament_events WHERE id = ?").get(id) as TEvent | undefined;
}

type EntryRow = Omit<Entry, "name" | "club" | "points" | "present"> & {
  fn: string; ln: string; club: string | null; pts: number; ci: number;
  pfn: string | null; pln: string | null; pclub: string | null; ppts: number | null; pci: number | null;
};
const ENTRY_SQL = `
  SELECT e.*, p.first_name fn, p.last_name ln, p.club, p.points pts, p.checked_in ci,
         q.first_name pfn, q.last_name pln, q.club pclub, q.points ppts, q.checked_in pci
  FROM tournament_entries e
  JOIN tournament_players p ON p.id = e.player_id
  LEFT JOIN tournament_players q ON q.id = e.partner_id`;

function toEntry(r: EntryRow): Entry {
  const { fn, ln, club, pts, ci, pfn, pln, pclub, ppts, pci, ...e } = r;
  const double = e.partner_id != null;
  return {
    ...e,
    name: double ? `${fn} ${ln[0]}. / ${pfn} ${pln?.[0]}.` : `${fn} ${ln}`,
    club: double && pclub && pclub !== club ? `${club ?? "?"} / ${pclub}` : club,
    points: pts + (ppts ?? 0),
    present: !!ci && (!double || !!pci),
  };
}

export function getEntries(eventId: number) {
  return (db.prepare(`${ENTRY_SQL} WHERE e.event_id = ? ORDER BY e.status, pts + IFNULL(ppts, 0) DESC, e.id`).all(eventId) as EntryRow[]).map(toEntry);
}
export function getTournamentEntries(tournamentId: number) {
  return (db.prepare(`${ENTRY_SQL} JOIN tournament_events v ON v.id = e.event_id WHERE v.tournament_id = ?`).all(tournamentId) as EntryRow[]).map(toEntry);
}

function parseMatch(r: Omit<TMatch, "sets"> & { sets: string }): TMatch {
  return { ...r, sets: JSON.parse(r.sets) };
}
export function getMatches(eventId: number) {
  return (db.prepare("SELECT * FROM tournament_matches WHERE event_id = ? ORDER BY stage DESC, group_no, round DESC, slot").all(eventId) as (Omit<TMatch, "sets"> & { sets: string })[]).map(parseMatch);
}
export function getMatch(id: number) {
  const r = db.prepare("SELECT * FROM tournament_matches WHERE id = ?").get(id) as (Omit<TMatch, "sets"> & { sets: string }) | undefined;
  return r && parseMatch(r);
}
export function getTournamentMatches(tournamentId: number, where = "1") {
  return (db.prepare(`SELECT m.* FROM tournament_matches m JOIN tournament_events v ON v.id = m.event_id WHERE v.tournament_id = ? AND ${where}`).all(tournamentId) as (Omit<TMatch, "sets"> & { sets: string })[]).map(parseMatch);
}

// ---------------------------------------------------------------------------
// Inscriptions et tarifs
// ---------------------------------------------------------------------------

export function newRef() {
  // Code lisible (pas de 0/O ni 1/I) utilisé pour retrouver sa réservation
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.randomBytes(8), (b) => alphabet[b % alphabet.length]).join("");
}

/** Montant dû par un joueur selon ses tableaux (le double est facturé par joueur). */
export function computeDue(t: Tournament, playerId: number) {
  const rows = db.prepare(`
    SELECT v.is_double FROM tournament_entries e JOIN tournament_events v ON v.id = e.event_id
    WHERE (e.player_id = ? OR e.partner_id = ?) AND e.status != 'forfait'`).all(playerId, playerId) as { is_double: number }[];
  const singles = rows.filter((r) => !r.is_double).length;
  const doubles = rows.length - singles;
  return (singles === 0 ? 0 : singles === 1 ? t.price_1 : t.price_2 + (singles - 2) * t.price_1) + doubles * t.price_double;
}

export function refreshDue(t: Tournament, playerId: number) {
  db.prepare("UPDATE tournament_players SET amount_due = ? WHERE id = ?").run(computeDue(t, playerId), playerId);
}

/** Raison pour laquelle un joueur ne peut pas entrer dans ce tableau, ou null. */
export function ineligibility(ev: TEvent, p: { points: number; birth_year: number | null }) {
  if (ev.max_points != null && p.points > ev.max_points) return `${ev.name} : réservé aux joueurs de ${ev.max_points} points maximum`;
  if (ev.min_points != null && p.points < ev.min_points) return `${ev.name} : réservé aux joueurs de ${ev.min_points} points minimum`;
  if (ev.min_birth_year != null && (p.birth_year == null || p.birth_year < ev.min_birth_year))
    return `${ev.name} : réservé aux joueurs nés en ${ev.min_birth_year} ou après`;
  return null;
}

export function eventFill(eventId: number) {
  return (db.prepare("SELECT COUNT(*) n FROM tournament_entries WHERE event_id = ? AND status = 'inscrit'").get(eventId) as { n: number }).n;
}

// ---------------------------------------------------------------------------
// Tirage au sort
// ---------------------------------------------------------------------------

function shuffle<T>(a: T[]) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Ordre des têtes de série dans un tableau de taille n : [1, n, n/2+1, n/2, …] */
export function seedOrder(n: number) {
  let order = [1, 2];
  while (order.length < n) order = order.flatMap((s) => [s, order.length * 2 + 1 - s]);
  return order.slice(0, n);
}

/** Ordre officiel des rencontres de poule (numéros de joueurs dans la poule). */
function groupOrder(n: number): [number, number][] {
  if (n === 3) return [[2, 3], [1, 3], [1, 2]];
  if (n === 4) return [[1, 4], [2, 3], [1, 3], [2, 4], [1, 2], [3, 4]];
  // Méthode du cercle pour les poules plus grandes
  const ids = Array.from({ length: n % 2 ? n + 1 : n }, (_, i) => i + 1);
  const res: [number, number][] = [];
  for (let r = 0; r < ids.length - 1; r++) {
    for (let i = 0; i < ids.length / 2; i++) {
      const a = ids[i], b = ids[ids.length - 1 - i];
      if (a <= n && b <= n) res.push(a < b ? [a, b] : [b, a]);
    }
    ids.splice(1, 0, ids.pop()!);
  }
  return res;
}

function handicapFor(ev: TEvent, a: Entry | undefined, b: Entry | undefined): [number, number] {
  if (!ev.handicap || !a || !b) return [0, 0];
  // 1 point d'avance par tranche de 100 points d'écart, 8 au maximum
  const h = Math.min(8, Math.floor(Math.abs(a.points - b.points) / 100));
  return a.points < b.points ? [h, 0] : [0, h];
}

const insertMatch = () => db.prepare(`
  INSERT INTO tournament_matches (event_id, stage, group_no, round, slot, entry_a, entry_b, handicap_a, handicap_b, status, ready_at)
  VALUES (@event_id, @stage, @group_no, @round, @slot, @entry_a, @entry_b, @handicap_a, @handicap_b, @status, @ready_at)`);

/**
 * Tirage au sort d'un tableau : seuls les joueurs pointés sont retenus.
 * Poules : têtes de série en serpentin, le reste tiré au sort par chapeaux en évitant deux joueurs du même club.
 */
export function drawEvent(eventId: number, opts: { includeAbsent?: boolean } = {}) {
  const ev = getEvent(eventId)!;
  const started = db.prepare("SELECT COUNT(*) n FROM tournament_matches WHERE event_id = ? AND status IN ('en_cours','termine') AND outcome IS NOT 'exempt'").get(eventId) as { n: number };
  if (started.n > 0) throw new Error("Des matchs ont déjà été joués : le tirage ne peut plus être refait.");

  const all = getEntries(eventId).filter((e) => e.status !== "attente");
  const players = all.filter((e) => opts.includeAbsent || e.present);
  if (players.length < 2) throw new Error("Il faut au moins 2 joueurs pointés pour faire le tirage.");

  db.transaction(() => {
    db.prepare("DELETE FROM tournament_matches WHERE event_id = ?").run(eventId);
    db.prepare("UPDATE tournament_entries SET seed = NULL, group_no = NULL, final_rank = NULL, status = CASE WHEN status = 'forfait' THEN 'inscrit' ELSE status END WHERE event_id = ? AND status != 'attente'").run(eventId);
    // Inscrits non pointés : forfait
    for (const e of all) if (!players.includes(e)) db.prepare("UPDATE tournament_entries SET status = 'forfait' WHERE id = ?").run(e.id);

    // Classement par points, tirage au sort entre ex æquo
    const sorted = shuffle(players).sort((a, b) => b.points - a.points);
    sorted.forEach((e, i) => db.prepare("UPDATE tournament_entries SET seed = ? WHERE id = ?").run(i + 1, e.id));
    sorted.forEach((e, i) => (e.seed = i + 1));

    if (ev.format === "ko" || sorted.length <= 2) {
      buildBracket(ev, sorted.map((e) => ({ entry: e })), true);
      db.prepare("UPDATE tournament_events SET status = 'tableau' WHERE id = ?").run(eventId);
    } else {
      const groupCount = Math.max(1, Math.floor(sorted.length / ev.group_size));
      const groups: Entry[][] = Array.from({ length: groupCount }, () => []);
      for (let pot = 0; pot * groupCount < sorted.length; pot++) {
        const potEntries = sorted.slice(pot * groupCount, (pot + 1) * groupCount);
        // Ordre des poules en serpentin pour équilibrer les niveaux
        const order = Array.from({ length: groupCount }, (_, i) => i);
        if (pot % 2) order.reverse();
        if (pot === 0) { potEntries.forEach((e, i) => groups[order[i]].push(e)); continue; }
        // Chapeaux suivants : tirage au sort, en évitant les joueurs du même club
        const free = new Set(order);
        for (const e of shuffle(potEntries)) {
          const candidates = shuffle([...free]);
          const g = candidates.find((g) => !groups[g].some((o) => o.club && o.club === e.club)) ?? candidates[0];
          groups[g].push(e);
          free.delete(g);
        }
      }
      const ins = insertMatch();
      const ts = now();
      groups.forEach((members, gi) => {
        members.forEach((e) => db.prepare("UPDATE tournament_entries SET group_no = ? WHERE id = ?").run(gi + 1, e.id));
        groupOrder(members.length).forEach(([x, y], slot) => {
          const a = members[x - 1], b = members[y - 1];
          const [ha, hb] = handicapFor(ev, a, b);
          ins.run({ event_id: eventId, stage: "poule", group_no: gi + 1, round: null, slot, entry_a: a.id, entry_b: b.id, handicap_a: ha, handicap_b: hb, status: "pret", ready_at: ts });
        });
      });
      db.prepare("UPDATE tournament_events SET status = 'poules' WHERE id = ?").run(eventId);
    }
  })();
}

/**
 * Construit le tableau à élimination directe.
 * `qualified` est dans l'ordre des têtes de série ; `group` sert à séparer les sortants d'une même poule.
 */
function buildBracket(ev: TEvent, qualified: { entry: Entry; group?: number; rankInGroup?: number }[], bySeed: boolean) {
  const n = qualified.length;
  let size = 2;
  while (size < n) size *= 2;
  const order = seedOrder(size); // order[pos] = numéro de tête de série
  const posOfSeed = new Map(order.map((s, pos) => [s, pos]));
  const slots: (Entry | null)[] = Array(size).fill(null);

  if (bySeed) {
    // Tirage par niveaux : les têtes de série 3-4, 5-8, 9-16… sont tirées au sort entre elles
    const seeds = qualified.map((q) => q.entry);
    let lo = 2;
    while (lo < n) {
      const hi = Math.min(n, lo * 2);
      const tier = shuffle(seeds.slice(lo, hi));
      seeds.splice(lo, tier.length, ...tier);
      lo = hi;
    }
    seeds.forEach((e, i) => (slots[posOfSeed.get(i + 1)!] = e));
  } else {
    // Premiers de poule aux places des têtes de série ; les suivants dans l'autre moitié du tableau que leur premier
    const firsts = qualified.filter((q) => q.rankInGroup === 1);
    const others = qualified.filter((q) => q.rankInGroup !== 1);
    const groupPos = new Map<number, number>();
    firsts.forEach((q, i) => { const pos = posOfSeed.get(i + 1)!; slots[pos] = q.entry; groupPos.set(q.group!, pos); });
    const freeSlots = order.map((s, pos) => ({ s, pos })).filter(({ s }) => s > firsts.length && s <= n).map(({ pos }) => pos);
    const half = size / 2;
    const quarter = Math.max(1, size / 4);
    for (const q of [...others].sort((a, b) => (a.rankInGroup ?? 0) - (b.rankInGroup ?? 0))) {
      const fp = groupPos.get(q.group!);
      const options = shuffle(freeSlots.filter((p) => slots[p] === null));
      const pick =
        options.find((p) => fp === undefined || Math.floor(p / half) !== Math.floor(fp / half)) ??
        options.find((p) => fp === undefined || Math.floor(p / quarter) !== Math.floor(fp / quarter)) ??
        options[0];
      slots[pick] = q.entry;
    }
  }

  const ins = insertMatch();
  const ts = now();
  // Création de tous les tours, du premier à la finale
  const ids: number[][] = [];
  for (let round = size, r = 0; round >= 2; round /= 2, r++) {
    ids[r] = [];
    for (let i = 0; i < round / 2; i++) {
      let a: Entry | null = null, b: Entry | null = null;
      if (r === 0) { a = slots[i * 2]; b = slots[i * 2 + 1]; }
      const [ha, hb] = handicapFor(ev, a ?? undefined, b ?? undefined);
      const ready = r === 0 && a && b;
      ids[r][i] = Number(ins.run({ event_id: ev.id, stage: "ko", group_no: null, round, slot: i, entry_a: a?.id ?? null, entry_b: b?.id ?? null, handicap_a: ha, handicap_b: hb, status: ready ? "pret" : "attente", ready_at: ready ? ts : null }).lastInsertRowid);
    }
  }
  const link = db.prepare("UPDATE tournament_matches SET next_match = ?, next_side = ? WHERE id = ?");
  for (let r = 0; r < ids.length - 1; r++) ids[r].forEach((id, i) => link.run(ids[r + 1][Math.floor(i / 2)], i % 2 ? "b" : "a", id));
  // Exempts : qualification directe pour le tour suivant
  ids[0].forEach((id, i) => {
    const a = slots[i * 2], b = slots[i * 2 + 1];
    if ((a && !b) || (!a && b)) closeMatch(id, (a ?? b)!.id, "exempt", []);
  });
}

// ---------------------------------------------------------------------------
// Classements de poule
// ---------------------------------------------------------------------------

export type Standing = { entry: Entry; played: number; won: number; lost: number; pts: number; setsFor: number; setsAgainst: number; rank: number };

function setTally(m: TMatch, entryId: number) {
  let f = 0, a = 0, pf = 0, pa = 0;
  for (const [x, y] of m.sets) {
    const [mine, theirs] = m.entry_a === entryId ? [x, y] : [y, x];
    pf += mine; pa += theirs;
    if (isSetDone(mine, theirs)) mine > theirs ? f++ : a++;
  }
  return { f, a, pf, pa };
}

export function groupStandings(entries: Entry[], matches: TMatch[]): Standing[] {
  const done = matches.filter((m) => m.status === "termine");
  const stats = (ids: Set<number>) => {
    const res = new Map<number, { won: number; lost: number; pts: number; sf: number; sa: number; pf: number; pa: number; played: number }>();
    for (const id of ids) res.set(id, { won: 0, lost: 0, pts: 0, sf: 0, sa: 0, pf: 0, pa: 0, played: 0 });
    for (const m of done) {
      if (!ids.has(m.entry_a!) || !ids.has(m.entry_b!)) continue;
      for (const id of [m.entry_a!, m.entry_b!]) {
        const s = res.get(id)!;
        const t = setTally(m, id);
        s.played++; s.sf += t.f; s.sa += t.a; s.pf += t.pf; s.pa += t.pa;
        if (m.winner === id) { s.won++; s.pts += 2; } else { s.lost++; s.pts += m.outcome === "forfait" ? 0 : 1; }
      }
    }
    return res;
  };
  const ratio = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : Infinity) : a / b);
  const global = stats(new Set(entries.map((e) => e.id)));

  // Départage : points, puis confrontations particulières entre ex æquo (points, manches, points de jeu)
  const byPts = new Map<number, Entry[]>();
  for (const e of entries) {
    const p = global.get(e.id)!.pts;
    byPts.set(p, [...(byPts.get(p) ?? []), e]);
  }
  const ordered: Entry[] = [];
  for (const p of [...byPts.keys()].sort((a, b) => b - a)) {
    const tied = byPts.get(p)!;
    if (tied.length === 1) { ordered.push(tied[0]); continue; }
    const sub = stats(new Set(tied.map((e) => e.id)));
    tied.sort((x, y) => {
      const a = sub.get(x.id)!, b = sub.get(y.id)!;
      return b.pts - a.pts || ratio(b.sf, b.sa) - ratio(a.sf, a.sa) || ratio(b.pf, b.pa) - ratio(a.pf, a.pa) || (x.seed ?? 99) - (y.seed ?? 99);
    });
    ordered.push(...tied);
  }
  return ordered.map((entry, i) => {
    const s = global.get(entry.id)!;
    return { entry, played: s.played, won: s.won, lost: s.lost, pts: s.pts, setsFor: s.sf, setsAgainst: s.sa, rank: i + 1 };
  });
}

// ---------------------------------------------------------------------------
// Déroulement des matchs
// ---------------------------------------------------------------------------

export const isSetDone = (a: number, b: number) => (a >= 11 || b >= 11) && Math.abs(a - b) >= 2;
export const setsToWin = (bestOf: number) => Math.ceil(bestOf / 2);

export function setsWon(m: TMatch) {
  let a = 0, b = 0;
  for (const [x, y] of m.sets) if (isSetDone(x, y)) x > y ? a++ : b++;
  return [a, b] as const;
}

/** Analyse « 11-7 9-11 11-5 » et vérifie que le score est complet. */
export function parseScore(text: string, bestOf: number): number[][] {
  const sets = text.trim().split(/[\s,;]+/).filter(Boolean).map((s) => {
    const m = s.match(/^(\d{1,2})[-/:](\d{1,2})$/);
    if (!m) throw new Error(`Manche illisible : « ${s} » (format attendu 11-7)`);
    return [Number(m[1]), Number(m[2])];
  });
  let a = 0, b = 0;
  const need = setsToWin(bestOf);
  for (const [x, y] of sets) {
    if (a === need || b === need) throw new Error("Trop de manches pour ce match");
    const valid = isSetDone(x, y) && (Math.max(x, y) === 11 || Math.abs(x - y) === 2);
    if (!valid) throw new Error(`Manche impossible : ${x}-${y}`);
    x > y ? a++ : b++;
  }
  if (a !== need && b !== need) throw new Error(`Match incomplet : il faut ${need} manches gagnantes`);
  return sets;
}

function entryPlayers(entryId: number) {
  const e = db.prepare("SELECT player_id, partner_id FROM tournament_entries WHERE id = ?").get(entryId) as { player_id: number; partner_id: number | null } | undefined;
  return e ? [e.player_id, e.partner_id].filter((x): x is number => x != null) : [];
}

/** Clôt un match et fait avancer le tableau (vainqueur au tour suivant, classements, tableau final). */
export function closeMatch(matchId: number, winner: number, outcome: "normal" | "forfait" | "exempt", sets: number[][]) {
  const m = getMatch(matchId)!;
  const ts = now();
  db.prepare("UPDATE tournament_matches SET winner = ?, outcome = ?, sets = ?, status = 'termine', finished_at = ?, started_at = IFNULL(started_at, ?), table_no = CASE WHEN ? = 'exempt' THEN NULL ELSE table_no END WHERE id = ?")
    .run(winner, outcome, JSON.stringify(sets), ts, ts, outcome, matchId);
  const ev = getEvent(m.event_id)!;
  if (m.stage === "ko") {
    const loser = m.entry_a === winner ? m.entry_b : m.entry_a;
    if (loser && m.round && m.round <= 4) db.prepare("UPDATE tournament_entries SET final_rank = ? WHERE id = ?").run(m.round === 2 ? 2 : 3, loser);
    if (m.next_match) {
      db.prepare(`UPDATE tournament_matches SET entry_${m.next_side} = ? WHERE id = ?`).run(winner, m.next_match);
      const next = getMatch(m.next_match)!;
      if (next.entry_a && next.entry_b) {
        const entries = getEntries(ev.id);
        const [ha, hb] = handicapFor(ev, entries.find((e) => e.id === next.entry_a), entries.find((e) => e.id === next.entry_b));
        db.prepare("UPDATE tournament_matches SET status = 'pret', ready_at = ?, handicap_a = ?, handicap_b = ? WHERE id = ?").run(ts, ha, hb, next.id);
      }
    } else {
      db.prepare("UPDATE tournament_entries SET final_rank = 1 WHERE id = ?").run(winner);
      db.prepare("UPDATE tournament_events SET status = 'termine' WHERE id = ?").run(ev.id);
    }
  } else if (ev.status === "poules") {
    const left = db.prepare("SELECT COUNT(*) n FROM tournament_matches WHERE event_id = ? AND stage = 'poule' AND status != 'termine'").get(ev.id) as { n: number };
    if (left.n === 0) finishGroups(ev);
  }
}

/** Toutes les poules sont terminées : classement, puis tirage du tableau final. */
export function finishGroups(ev: TEvent) {
  const entries = getEntries(ev.id).filter((e) => e.group_no != null && e.status === "inscrit");
  const matches = getMatches(ev.id).filter((m) => m.stage === "poule");
  const groupNos = [...new Set(entries.map((e) => e.group_no!))].sort((a, b) => a - b);
  const standings = groupNos.map((g) => groupStandings(entries.filter((e) => e.group_no === g), matches.filter((m) => m.group_no === g)));
  db.transaction(() => {
    if (groupNos.length === 1) {
      // Poule unique : le classement de la poule est le classement final
      standings[0].forEach((s) => db.prepare("UPDATE tournament_entries SET final_rank = ? WHERE id = ?").run(s.rank, s.entry.id));
      db.prepare("UPDATE tournament_events SET status = 'termine' WHERE id = ?").run(ev.id);
      return;
    }
    const qualified: { entry: Entry; group: number; rankInGroup: number }[] = [];
    for (let rank = 1; rank <= ev.qualifiers; rank++)
      standings.forEach((st, gi) => { const s = st.find((x) => x.rank === rank); if (s) qualified.push({ entry: s.entry, group: groupNos[gi], rankInGroup: rank }); });
    buildBracket(ev, qualified, false);
    db.prepare("UPDATE tournament_events SET status = 'tableau' WHERE id = ?").run(ev.id);
  })();
}

/** Point marqué en direct par la table (côté a ou b). */
export function addPoint(matchId: number, side: "a" | "b") {
  const m = getMatch(matchId)!;
  if (m.status === "termine") throw new Error("Match terminé");
  if (!m.entry_a || !m.entry_b) throw new Error("Match incomplet");
  db.prepare("INSERT INTO tournament_points (match_id, side) VALUES (?, ?)").run(m.id, side);
  replayPoints(m);
}

export function undoPoint(matchId: number) {
  const m = getMatch(matchId)!;
  if (m.status === "termine") return;
  db.prepare("DELETE FROM tournament_points WHERE id = (SELECT MAX(id) FROM tournament_points WHERE match_id = ?)").run(m.id);
  replayPoints(m);
}

/** Recalcule les manches à partir de l'historique des points ; clôt le match s'il est gagné. */
function replayPoints(m: TMatch) {
  const ev = getEvent(m.event_id)!;
  const need = setsToWin(ev.best_of);
  const points = db.prepare("SELECT side FROM tournament_points WHERE match_id = ? ORDER BY id").all(m.id) as { side: "a" | "b" }[];
  const sets = [[m.handicap_a, m.handicap_b]];
  let wa = 0, wb = 0;
  for (const p of points) {
    const cur = sets[sets.length - 1];
    cur[p.side === "a" ? 0 : 1]++;
    if (!isSetDone(cur[0], cur[1])) continue;
    cur[0] > cur[1] ? wa++ : wb++;
    if (wa === need || wb === need) {
      closeMatch(m.id, wa === need ? m.entry_a! : m.entry_b!, "normal", sets);
      return;
    }
    sets.push([m.handicap_a, m.handicap_b]);
  }
  db.prepare("UPDATE tournament_matches SET sets = ?, status = CASE WHEN ? THEN 'en_cours' ELSE status END, started_at = IFNULL(started_at, ?) WHERE id = ?")
    .run(JSON.stringify(points.length ? sets : []), points.length ? 1 : 0, now(), m.id);
}

// ---------------------------------------------------------------------------
// Appel des matchs sur les tables
// ---------------------------------------------------------------------------

export function busyPlayers(tournamentId: number) {
  const busy = new Set<number>();
  for (const m of getTournamentMatches(tournamentId, "m.status IN ('appele','en_cours')"))
    for (const e of [m.entry_a, m.entry_b]) if (e) entryPlayers(e).forEach((p) => busy.add(p));
  return busy;
}

export function freeTables(t: Tournament) {
  const used = new Set(getTournamentMatches(t.id, "m.status IN ('appele','en_cours') AND m.table_no IS NOT NULL").map((m) => m.table_no));
  return Array.from({ length: t.tables_count }, (_, i) => i + 1).filter((n) => !used.has(n));
}

/** File d'attente : matchs prêts dont aucun joueur n'est déjà sur une table, les plus anciens d'abord. */
export function queue(t: Tournament) {
  const busy = busyPlayers(t.id);
  const order = new Map(getEvents(t.id).map((e) => [e.id, e.position]));
  const ready = getTournamentMatches(t.id, "m.status = 'pret'").sort(
    (a, b) => (a.ready_at ?? "").localeCompare(b.ready_at ?? "") || (b.round ?? 0) - (a.round ?? 0) || (order.get(a.event_id)! - order.get(b.event_id)!) || a.slot - b.slot || a.id - b.id,
  );
  // Repos : un joueur qui sort de table passe après ceux qui attendent depuis plus longtemps
  const lastPlayed = new Map<number, string>();
  for (const m of getTournamentMatches(t.id, "m.status = 'termine' AND m.outcome = 'normal'"))
    for (const e of [m.entry_a, m.entry_b]) if (e) for (const p of entryPlayers(e)) if ((lastPlayed.get(p) ?? "") < m.finished_at!) lastPlayed.set(p, m.finished_at!);
  const rested = (m: TMatch) => {
    const ps = [m.entry_a!, m.entry_b!].flatMap(entryPlayers);
    return Math.max(0, ...ps.map((p) => (lastPlayed.has(p) ? Date.parse(lastPlayed.get(p)!) : 0)));
  };
  const recent = Date.now() - 3 * 60_000;
  return ready
    .map((m) => ({ m, blocked: [m.entry_a!, m.entry_b!].flatMap(entryPlayers).some((p) => busy.has(p)), tired: rested(m) > recent }))
    .sort((x, y) => Number(x.blocked) - Number(y.blocked) || Number(x.tired) - Number(y.tired));
}

export function callMatch(matchId: number, table: number) {
  db.prepare("UPDATE tournament_matches SET status = 'appele', table_no = ?, called_at = ? WHERE id = ? AND status = 'pret'").run(table, now(), matchId);
}

/** Remplit toutes les tables libres avec les prochains matchs jouables. Renvoie le nombre de matchs appelés. */
export function autoCall(t: Tournament) {
  let called = 0;
  db.transaction(() => {
    const tables = freeTables(t);
    const busy = busyPlayers(t.id);
    for (const { m, blocked } of queue(t)) {
      if (!tables.length) break;
      if (blocked) continue;
      const ps = [m.entry_a!, m.entry_b!].flatMap(entryPlayers);
      if (ps.some((p) => busy.has(p))) continue;
      callMatch(m.id, tables.shift()!);
      ps.forEach((p) => busy.add(p));
      called++;
    }
  })();
  return called;
}

// ---------------------------------------------------------------------------
// Lots
// ---------------------------------------------------------------------------

/** Attribue les lots sportifs d'après les classements finaux des tableaux terminés. */
export function autoAwardPrizes(tournamentId: number) {
  const prizes = db.prepare("SELECT * FROM tournament_prizes WHERE tournament_id = ? AND event_id IS NOT NULL AND rank IS NOT NULL ORDER BY event_id, rank, id").all(tournamentId) as { id: number; event_id: number; rank: number; winner_entry: number | null }[];
  let n = 0;
  db.transaction(() => {
    for (const p of prizes) {
      if (p.winner_entry) continue;
      const taken = new Set((db.prepare("SELECT winner_entry FROM tournament_prizes WHERE event_id = ? AND rank = ? AND winner_entry IS NOT NULL").all(p.event_id, p.rank) as { winner_entry: number }[]).map((r) => r.winner_entry));
      const cand = (db.prepare("SELECT id FROM tournament_entries WHERE event_id = ? AND final_rank = ? ORDER BY id").all(p.event_id, p.rank) as { id: number }[]).find((e) => !taken.has(e.id));
      if (cand) { db.prepare("UPDATE tournament_prizes SET winner_entry = ? WHERE id = ?").run(cand.id, p.id); n++; }
    }
  })();
  return n;
}

/** Tombola : tirage au sort parmi les joueurs pointés qui n'ont pas encore gagné de lot de tombola. */
export function drawRaffle(prizeId: number) {
  const prize = db.prepare("SELECT * FROM tournament_prizes WHERE id = ?").get(prizeId) as { tournament_id: number; winner_player: number | null } | undefined;
  if (!prize) throw new Error("Lot introuvable");
  const pool = db.prepare(`SELECT id FROM tournament_players WHERE tournament_id = ? AND checked_in = 1
    AND id NOT IN (SELECT winner_player FROM tournament_prizes WHERE tournament_id = ? AND winner_player IS NOT NULL)`).all(prize.tournament_id, prize.tournament_id) as { id: number }[];
  if (!pool.length) throw new Error("Aucun joueur pointé disponible pour le tirage");
  const winner = pool[crypto.randomInt(pool.length)].id;
  db.prepare("UPDATE tournament_prizes SET winner_player = ?, handed_at = NULL WHERE id = ?").run(winner, prizeId);
  return winner;
}

// ---------------------------------------------------------------------------
// Vues
// ---------------------------------------------------------------------------

export function entriesById(tournamentId: number) {
  return new Map(getTournamentEntries(tournamentId).map((e) => [e.id, e]));
}

/** Tout ce qu'il faut pour afficher un tableau : poules avec classements et tableau final. */
export function eventView(ev: TEvent) {
  const entries = getEntries(ev.id);
  const matches = getMatches(ev.id);
  const groupNos = [...new Set(entries.filter((e) => e.group_no != null).map((e) => e.group_no!))].sort((a, b) => a - b);
  const groups = groupNos.map((g) => {
    const members = entries.filter((e) => e.group_no === g && e.status === "inscrit");
    const gm = matches.filter((m) => m.stage === "poule" && m.group_no === g);
    return { no: g, standings: groupStandings(members, gm), matches: gm, done: gm.every((m) => m.status === "termine") };
  });
  const ko = matches.filter((m) => m.stage === "ko");
  const rounds = [...new Set(ko.map((m) => m.round!))].sort((a, b) => b - a).map((r) => ({ round: r, matches: ko.filter((m) => m.round === r) }));
  const podium = entries.filter((e) => e.final_rank != null && e.final_rank <= 3).sort((a, b) => a.final_rank! - b.final_rank!);
  return { entries, matches, groups, rounds, podium };
}

export const groupLetter = (n: number) => String.fromCharCode(64 + n);

export type Prize = {
  id: number; event_id: number | null; rank: number | null; label: string; value: number | null; sponsor: string | null;
  winner_entry: number | null; winner_player: number | null; handed_at: string | null; raffle_name: string | null;
};

export function getPrizes(tournamentId: number) {
  return db.prepare(`
    SELECT z.*, p.first_name || ' ' || p.last_name raffle_name FROM tournament_prizes z
    LEFT JOIN tournament_players p ON p.id = z.winner_player
    LEFT JOIN tournament_events v ON v.id = z.event_id
    WHERE z.tournament_id = ? ORDER BY z.event_id IS NULL, v.position, z.rank, z.id`).all(tournamentId) as Prize[];
}
