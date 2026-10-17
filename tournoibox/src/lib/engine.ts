import "server-only";
import crypto from "node:crypto";
import { db } from "./db";
import { getEvent, getTournament, type TEvent } from "./tournament";
import { sportOf, invalidSet } from "./sports";

// Moteur de compétition : tirage au sort, poules, tableau final, avancement des matchs.

export type Entry = {
  id: number; event_id: number; player_id: number; partner_id: number | null; status: "inscrit" | "attente" | "forfait";
  seed: number | null; group_no: number | null; final_rank: number | null;
  name: string; club: string | null; points: number; present: boolean;
};

export type Match = {
  id: number; event_id: number; stage: "poule" | "ko"; group_no: number | null; round: number | null; slot: number;
  entry_a: number | null; entry_b: number | null; handicap_a: number; handicap_b: number; sets: number[][];
  winner: number | null; status: "attente" | "pret" | "appele" | "en_cours" | "termine"; outcome: string | null;
  court_no: number | null; next_match: number | null; next_side: "a" | "b" | null;
  ready_at: string | null; called_at: string | null; started_at: string | null; finished_at: string | null;
};

export type Standing = { entry: Entry; played: number; won: number; lost: number; pts: number; setsFor: number; setsAgainst: number; rank: number };

export const groupLetter = (n: number) => (n <= 26 ? String.fromCharCode(64 + n) : `P${n}`);
export const roundLabel = (round: number | null) =>
  round === 2 ? "Finale" : round === 4 ? "Demi-finales" : round === 8 ? "Quarts de finale" : round ? `1/${round / 2} de finale` : "";
export const rankLabel = (rank: number | null) =>
  rank === 1 ? "Vainqueur" : rank === 2 ? "Finaliste" : rank === 3 ? "Demi-finaliste" : rank ? `${rank}e` : "";

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

type EntryRow = Omit<Entry, "name" | "club" | "points" | "present"> & {
  fn: string; ln: string; club: string | null; pts: number; ci: number;
  pfn: string | null; pln: string | null; pclub: string | null; ppts: number | null; pci: number | null;
};
const ENTRY_SQL = `
  SELECT e.*, p.first_name fn, p.last_name ln, p.club, p.points pts, p.checked_in ci,
         q.first_name pfn, q.last_name pln, q.club pclub, q.points ppts, q.checked_in pci
  FROM entries e JOIN players p ON p.id = e.player_id LEFT JOIN players q ON q.id = e.partner_id`;

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
export function entriesById(tournamentId: number) {
  const rows = db.prepare(`${ENTRY_SQL} JOIN events v ON v.id = e.event_id WHERE v.tournament_id = ?`).all(tournamentId) as EntryRow[];
  return new Map(rows.map(toEntry).map((e) => [e.id, e]));
}

type MatchRow = Omit<Match, "sets"> & { sets: string };
const parse = (r: MatchRow): Match => ({ ...r, sets: JSON.parse(r.sets) });

export function getMatches(eventId: number) {
  return (db.prepare("SELECT * FROM matches WHERE event_id = ? ORDER BY stage DESC, group_no, round DESC, slot").all(eventId) as MatchRow[]).map(parse);
}
export function getMatch(id: number) {
  const r = db.prepare("SELECT * FROM matches WHERE id = ?").get(id) as MatchRow | undefined;
  return r && parse(r);
}
export function tournamentMatches(tournamentId: number, where = "1") {
  return (db.prepare(`SELECT m.* FROM matches m JOIN events v ON v.id = m.event_id WHERE v.tournament_id = ? AND ${where}`).all(tournamentId) as MatchRow[]).map(parse);
}

/** Manches gagnées par chaque côté (une manche saisie est gagnée par le score le plus haut). */
export function setsWon(m: Pick<Match, "sets">) {
  let a = 0, b = 0;
  for (const [x, y] of m.sets) if (x !== y) x > y ? a++ : b++;
  return [a, b] as const;
}
export const setsToWin = (bestOf: number) => Math.ceil(bestOf / 2);

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

/** Ordre des têtes de série dans un tableau de taille n : 1 et 2 aux extrémités, 3-4 dans les autres quarts… */
export function seedOrder(n: number) {
  let order = [1, 2];
  while (order.length < n) order = order.flatMap((s) => [s, order.length * 2 + 1 - s]);
  return order.slice(0, n);
}

/** Ordre des rencontres de poule (numéros de joueurs). Poules de 3 et 4 : ordre fédéral. */
export function groupOrder(n: number): [number, number][] {
  if (n === 2) return [[1, 2]];
  if (n === 3) return [[2, 3], [1, 3], [1, 2]];
  if (n === 4) return [[1, 4], [2, 3], [1, 3], [2, 4], [1, 2], [3, 4]];
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
  INSERT INTO matches (event_id, stage, group_no, round, slot, entry_a, entry_b, handicap_a, handicap_b, status, ready_at)
  VALUES (@event_id, @stage, @group_no, @round, @slot, @entry_a, @entry_b, @handicap_a, @handicap_b, @status, @ready_at)`);

export function playedCount(eventId: number) {
  return (db.prepare("SELECT COUNT(*) n FROM matches WHERE event_id = ? AND status IN ('en_cours','termine') AND IFNULL(outcome, '') != 'exempt'").get(eventId) as { n: number }).n;
}

/** Nombre de poules et leur taille pour n joueurs, comme le fera le tirage. */
export function groupPlan(n: number, size: number) {
  const count = Math.max(1, Math.floor(n / size));
  const base = Math.floor(n / count), extra = n % count; // les premières poules reçoivent un joueur de plus
  return { count, sizes: Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0)) };
}

/**
 * Tirage au sort d'un tableau. Seuls les joueurs présents sont retenus (les autres sont déclarés forfait).
 * Poules : têtes de série réparties en serpentin, puis chaque chapeau tiré au sort en séparant les joueurs d'un même club.
 */
export function drawEvent(eventId: number, opts: { includeAbsent?: boolean } = {}) {
  const ev = getEvent(eventId)!;
  if (playedCount(eventId) > 0) throw new Error("Des matchs ont déjà été joués : le tirage ne peut plus être refait.");
  const all = getEntries(eventId).filter((e) => e.status !== "attente");
  const players = all.filter((e) => opts.includeAbsent || e.present);
  if (players.length < 2) throw new Error("Il faut au moins 2 joueurs présents pour faire le tirage.");

  db.transaction(() => {
    db.prepare("DELETE FROM matches WHERE event_id = ?").run(eventId);
    db.prepare("UPDATE entries SET seed = NULL, group_no = NULL, final_rank = NULL, status = 'inscrit' WHERE event_id = ? AND status != 'attente'").run(eventId);
    for (const e of all) if (!players.includes(e)) db.prepare("UPDATE entries SET status = 'forfait' WHERE id = ?").run(e.id);

    // Classement par points, tirage au sort entre ex æquo
    const sorted = shuffle(players).sort((a, b) => b.points - a.points);
    sorted.forEach((e, i) => { e.seed = i + 1; db.prepare("UPDATE entries SET seed = ? WHERE id = ?").run(i + 1, e.id); });

    if (ev.format === "ko" || sorted.length <= 2) {
      buildBracket(ev, sorted.map((entry) => ({ entry })), true);
      db.prepare("UPDATE events SET status = 'tableau' WHERE id = ?").run(eventId);
    } else {
      const { count } = groupPlan(sorted.length, ev.group_size);
      const groups: Entry[][] = Array.from({ length: count }, () => []);
      for (let pot = 0; pot * count < sorted.length; pot++) {
        const potEntries = sorted.slice(pot * count, (pot + 1) * count);
        const order = Array.from({ length: count }, (_, i) => i);
        if (pot % 2) order.reverse();
        // Premier chapeau : les têtes de série, une par poule
        if (pot === 0) { potEntries.forEach((e, i) => groups[order[i]].push(e)); continue; }
        const free = new Set(order);
        for (const e of shuffle(potEntries)) {
          const candidates = shuffle([...free]);
          const g = candidates.find((g) => !groups[g].some((o) => o.club && o.club === e.club)) ?? candidates[0];
          groups[g].push(e);
          free.delete(g);
        }
      }
      writeGroups(ev, groups);
      db.prepare("UPDATE events SET status = 'poules' WHERE id = ?").run(eventId);
    }
    db.prepare("UPDATE tournaments SET status = 'en_cours' WHERE id = ? AND status = 'inscriptions'").run(ev.tournament_id);
  })();
}

function writeGroups(ev: TEvent, groups: Entry[][]) {
  const ins = insertMatch();
  const ts = now();
  db.prepare("DELETE FROM matches WHERE event_id = ? AND stage = 'poule'").run(ev.id);
  groups.forEach((members, gi) => {
    // Dans la poule, le mieux classé porte le n° 1
    members.sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
    members.forEach((e) => db.prepare("UPDATE entries SET group_no = ? WHERE id = ?").run(gi + 1, e.id));
    groupOrder(members.length).forEach(([x, y], slot) => {
      const a = members[x - 1], b = members[y - 1];
      const [ha, hb] = handicapFor(ev, a, b);
      ins.run({ event_id: ev.id, stage: "poule", group_no: gi + 1, round: null, slot, entry_a: a.id, entry_b: b.id, handicap_a: ha, handicap_b: hb, status: "pret", ready_at: ts });
    });
  });
}

/** Échange deux joueurs de poule (correction manuelle du tirage, avant le premier match joué). */
export function swapInGroups(eventId: number, entryA: number, entryB: number) {
  if (playedCount(eventId) > 0) throw new Error("Des matchs ont déjà été joués dans ce tableau.");
  const ev = getEvent(eventId)!;
  const entries = getEntries(eventId).filter((e) => e.group_no != null && e.status === "inscrit");
  const a = entries.find((e) => e.id === entryA), b = entries.find((e) => e.id === entryB);
  if (!a || !b) throw new Error("Joueur introuvable");
  if (a.group_no === b.group_no) throw new Error("Les deux joueurs sont déjà dans la même poule");
  [a.group_no, b.group_no] = [b.group_no, a.group_no];
  const count = Math.max(...entries.map((e) => e.group_no!));
  const groups = Array.from({ length: count }, (_, i) => entries.filter((e) => e.group_no === i + 1));
  db.transaction(() => writeGroups(ev, groups))();
}

/**
 * Tableau à élimination directe. `qualified` est dans l'ordre des têtes de série ;
 * pour une sortie de poules, `group` sert à placer deux sortants d'une même poule dans des moitiés opposées.
 */
function buildBracket(ev: TEvent, qualified: { entry: Entry; group?: number; rankInGroup?: number }[], bySeed: boolean) {
  const n = qualified.length;
  let size = 2;
  while (size < n) size *= 2;
  const order = seedOrder(size);
  const posOfSeed = new Map(order.map((s, pos) => [s, pos]));
  const slots: (Entry | null)[] = Array(size).fill(null);

  if (bySeed) {
    // Têtes de série 1 et 2 fixes ; 3-4, 5-8, 9-16… tirées au sort entre elles
    const seeds = qualified.map((q) => q.entry);
    let lo = 2;
    while (lo < n) {
      const hi = Math.min(n, lo * 2);
      seeds.splice(lo, hi - lo, ...shuffle(seeds.slice(lo, hi)));
      lo = hi;
    }
    seeds.forEach((e, i) => (slots[posOfSeed.get(i + 1)!] = e));
  } else {
    const firsts = qualified.filter((q) => q.rankInGroup === 1);
    const others = qualified.filter((q) => q.rankInGroup !== 1).sort((a, b) => (a.rankInGroup ?? 0) - (b.rankInGroup ?? 0));
    const groupPos = new Map<number, number>();
    firsts.forEach((q, i) => { const pos = posOfSeed.get(i + 1)!; slots[pos] = q.entry; groupPos.set(q.group!, pos); });
    const freeSlots = order.map((s, pos) => ({ s, pos })).filter(({ s }) => s > firsts.length && s <= n).map(({ pos }) => pos);
    const half = size / 2, quarter = Math.max(1, size / 4);
    for (const q of others) {
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
  const ids: number[][] = [];
  for (let round = size, r = 0; round >= 2; round /= 2, r++) {
    ids[r] = [];
    for (let i = 0; i < round / 2; i++) {
      const a = r === 0 ? slots[i * 2] : null, b = r === 0 ? slots[i * 2 + 1] : null;
      const [ha, hb] = handicapFor(ev, a ?? undefined, b ?? undefined);
      const ready = !!(a && b);
      ids[r][i] = Number(ins.run({ event_id: ev.id, stage: "ko", group_no: null, round, slot: i, entry_a: a?.id ?? null, entry_b: b?.id ?? null, handicap_a: ha, handicap_b: hb, status: ready ? "pret" : "attente", ready_at: ready ? ts : null }).lastInsertRowid);
    }
  }
  const link = db.prepare("UPDATE matches SET next_match = ?, next_side = ? WHERE id = ?");
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

export function groupStandings(entries: Entry[], matches: Match[]): Standing[] {
  const done = matches.filter((m) => m.status === "termine");
  const stats = (ids: Set<number>) => {
    const res = new Map<number, { won: number; lost: number; pts: number; sf: number; sa: number; pf: number; pa: number; played: number }>();
    for (const id of ids) res.set(id, { won: 0, lost: 0, pts: 0, sf: 0, sa: 0, pf: 0, pa: 0, played: 0 });
    for (const m of done) {
      if (!ids.has(m.entry_a!) || !ids.has(m.entry_b!)) continue;
      for (const id of [m.entry_a!, m.entry_b!]) {
        const s = res.get(id)!;
        s.played++;
        for (const [x, y] of m.sets) {
          const [mine, theirs] = m.entry_a === id ? [x, y] : [y, x];
          s.pf += mine; s.pa += theirs;
          if (mine > theirs) s.sf++; else if (theirs > mine) s.sa++;
        }
        // Victoire 2 points, défaite 1 point, forfait 0
        if (m.winner === id) { s.won++; s.pts += 2; } else { s.lost++; s.pts += m.outcome === "forfait" ? 0 : 1; }
      }
    }
    return res;
  };
  const ratio = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : Infinity) : a / b);
  const global = stats(new Set(entries.map((e) => e.id)));
  const byPts = new Map<number, Entry[]>();
  for (const e of entries) {
    const p = global.get(e.id)!.pts;
    byPts.set(p, [...(byPts.get(p) ?? []), e]);
  }
  // Départage des ex æquo par leurs confrontations : points, puis manches, puis points de jeu
  const ordered: Entry[] = [];
  for (const p of [...byPts.keys()].sort((a, b) => b - a)) {
    const tied = byPts.get(p)!;
    if (tied.length > 1) {
      const sub = stats(new Set(tied.map((e) => e.id)));
      tied.sort((x, y) => {
        const a = sub.get(x.id)!, b = sub.get(y.id)!;
        return b.pts - a.pts || ratio(b.sf, b.sa) - ratio(a.sf, a.sa) || ratio(b.pf, b.pa) - ratio(a.pf, a.pa) || (x.seed ?? 999) - (y.seed ?? 999);
      });
    }
    ordered.push(...tied);
  }
  return ordered.map((entry, i) => {
    const s = global.get(entry.id)!;
    return { entry, played: s.played, won: s.won, lost: s.lost, pts: s.pts, setsFor: s.sf, setsAgainst: s.sa, rank: i + 1 };
  });
}

// ---------------------------------------------------------------------------
// Résultats
// ---------------------------------------------------------------------------

/** Vérifie un score « 11-7 9-11 11-5 » selon les règles du sport et le format du match. */
export function parseScore(text: string, ev: TEvent): number[][] {
  const rule = sportOf(getTournament(ev.tournament_id)!.sport).set;
  const sets = text.trim().split(/[\s,;]+/).filter(Boolean).map((s) => {
    const m = s.match(/^(\d{1,3})[-/:](\d{1,3})$/);
    if (!m) throw new Error(`Score illisible : « ${s} » (format attendu 11-7)`);
    return [Number(m[1]), Number(m[2])];
  });
  if (!sets.length) throw new Error("Saisissez le score");
  const need = setsToWin(ev.best_of);
  let a = 0, b = 0;
  for (const [x, y] of sets) {
    if (a === need || b === need) throw new Error("Trop de manches : le match était déjà gagné");
    const why = invalidSet(x, y, rule);
    if (why) throw new Error(`${x}-${y} : ${why}`);
    x > y ? a++ : b++;
  }
  if (a !== need && b !== need) throw new Error(`Match incomplet : il faut ${need} manche${need > 1 ? "s" : ""} gagnante${need > 1 ? "s" : ""}`);
  return sets;
}

/** Clôt un match et fait avancer la compétition (tour suivant, classement, tableau final). */
export function closeMatch(matchId: number, winner: number, outcome: "normal" | "forfait" | "exempt", sets: number[][]) {
  const m = getMatch(matchId)!;
  const ts = now();
  db.prepare("UPDATE matches SET winner = ?, outcome = ?, sets = ?, status = 'termine', finished_at = ?, started_at = IFNULL(started_at, ?), court_no = CASE WHEN ? = 'exempt' THEN NULL ELSE court_no END WHERE id = ?")
    .run(winner, outcome, JSON.stringify(sets), ts, ts, outcome, matchId);
  const ev = getEvent(m.event_id)!;
  if (m.stage === "ko") {
    const loser = m.entry_a === winner ? m.entry_b : m.entry_a;
    if (loser && m.round && m.round <= 4) db.prepare("UPDATE entries SET final_rank = ? WHERE id = ?").run(m.round === 2 ? 2 : 3, loser);
    if (m.next_match) {
      db.prepare(`UPDATE matches SET entry_${m.next_side === "b" ? "b" : "a"} = ? WHERE id = ?`).run(winner, m.next_match);
      const next = getMatch(m.next_match)!;
      if (next.entry_a && next.entry_b) {
        const entries = getEntries(ev.id);
        const [ha, hb] = handicapFor(ev, entries.find((e) => e.id === next.entry_a), entries.find((e) => e.id === next.entry_b));
        db.prepare("UPDATE matches SET status = 'pret', ready_at = ?, handicap_a = ?, handicap_b = ? WHERE id = ?").run(ts, ha, hb, next.id);
      }
    } else {
      db.prepare("UPDATE entries SET final_rank = 1 WHERE id = ?").run(winner);
      finishEvent(ev);
    }
  } else if (ev.status === "poules") {
    const left = (db.prepare("SELECT COUNT(*) n FROM matches WHERE event_id = ? AND stage = 'poule' AND status != 'termine'").get(ev.id) as { n: number }).n;
    if (left === 0) finishGroups(ev);
  }
}

function finishEvent(ev: TEvent) {
  db.prepare("UPDATE events SET status = 'termine' WHERE id = ?").run(ev.id);
  const left = (db.prepare("SELECT COUNT(*) n FROM events WHERE tournament_id = ? AND status != 'termine'").get(ev.tournament_id) as { n: number }).n;
  if (left === 0) db.prepare("UPDATE tournaments SET status = 'termine' WHERE id = ?").run(ev.tournament_id);
}

/** Poules terminées : classements, puis tableau final (ou classement final s'il n'y a qu'une poule). */
export function finishGroups(ev: TEvent) {
  const entries = getEntries(ev.id).filter((e) => e.group_no != null && e.status === "inscrit");
  const matches = getMatches(ev.id).filter((m) => m.stage === "poule");
  const groupNos = [...new Set(entries.map((e) => e.group_no!))].sort((a, b) => a - b);
  const standings = groupNos.map((g) => groupStandings(entries.filter((e) => e.group_no === g), matches.filter((m) => m.group_no === g)));
  db.transaction(() => {
    if (groupNos.length === 1) {
      standings[0].forEach((s) => db.prepare("UPDATE entries SET final_rank = ? WHERE id = ?").run(s.rank, s.entry.id));
      finishEvent(ev);
      return;
    }
    const qualified: { entry: Entry; group: number; rankInGroup: number }[] = [];
    for (let rank = 1; rank <= ev.qualifiers; rank++)
      standings.forEach((st, gi) => { const s = st.find((x) => x.rank === rank); if (s) qualified.push({ entry: s.entry, group: groupNos[gi], rankInGroup: rank }); });
    buildBracket(ev, qualified, false);
    db.prepare("UPDATE events SET status = 'tableau' WHERE id = ?").run(ev.id);
  })();
}

/** Annule le résultat d'un match tant que la suite n'a pas été jouée (erreur de saisie). */
export function reopenMatch(matchId: number) {
  const m = getMatch(matchId)!;
  if (m.status !== "termine" || m.outcome === "exempt") throw new Error("Ce match n'a pas de résultat à annuler");
  const ev = getEvent(m.event_id)!;
  const hasKo = getMatches(ev.id).some((x) => x.stage === "ko");
  if (m.stage === "poule") {
    if (hasKo) throw new Error("Le tableau final est déjà tiré : impossible de modifier une poule");
    if (ev.status === "termine") {
      // Poule unique déjà classée : on revient en phase de poule
      db.prepare("UPDATE entries SET final_rank = NULL WHERE event_id = ?").run(ev.id);
      db.prepare("UPDATE events SET status = 'poules' WHERE id = ?").run(ev.id);
      db.prepare("UPDATE tournaments SET status = 'en_cours' WHERE id = ? AND status = 'termine'").run(ev.tournament_id);
    }
  } else if (m.next_match) {
    const next = getMatch(m.next_match)!;
    if (next.status === "termine" || next.status === "en_cours") throw new Error("Le match suivant a déjà été joué");
    db.prepare(`UPDATE matches SET entry_${m.next_side === "b" ? "b" : "a"} = NULL, status = 'attente', ready_at = NULL, court_no = NULL, called_at = NULL WHERE id = ?`).run(next.id);
  }
  db.transaction(() => {
    if (m.stage === "ko") {
      db.prepare("UPDATE entries SET final_rank = NULL WHERE id IN (?, ?)").run(m.entry_a, m.entry_b);
      if (ev.status === "termine") db.prepare("UPDATE events SET status = 'tableau' WHERE id = ?").run(ev.id);
      db.prepare("UPDATE tournaments SET status = 'en_cours' WHERE id = ? AND status = 'termine'").run(ev.tournament_id);
    }
    db.prepare("UPDATE matches SET winner = NULL, outcome = NULL, sets = '[]', status = 'pret', finished_at = NULL, court_no = NULL, called_at = NULL, started_at = NULL WHERE id = ?").run(m.id);
  })();
}

// ---------------------------------------------------------------------------
// Vue d'un tableau
// ---------------------------------------------------------------------------

export function eventView(ev: TEvent) {
  const entries = getEntries(ev.id);
  const matches = getMatches(ev.id);
  const groupNos = [...new Set(entries.filter((e) => e.group_no != null).map((e) => e.group_no!))].sort((a, b) => a - b);
  const groups = groupNos.map((g) => {
    const members = entries.filter((e) => e.group_no === g && e.status === "inscrit");
    const gm = matches.filter((m) => m.stage === "poule" && m.group_no === g);
    return { no: g, standings: groupStandings(members, gm), matches: gm, done: gm.length > 0 && gm.every((m) => m.status === "termine") };
  });
  const ko = matches.filter((m) => m.stage === "ko");
  const rounds = [...new Set(ko.map((m) => m.round!))].sort((a, b) => b - a).map((r) => ({ round: r, matches: ko.filter((m) => m.round === r) }));
  const podium = entries.filter((e) => e.final_rank != null && e.final_rank <= 3).sort((a, b) => a.final_rank! - b.final_rank!);
  const played = matches.filter((m) => m.status === "termine" && m.outcome !== "exempt").length;
  const total = matches.filter((m) => m.outcome !== "exempt").length;
  return { entries, matches, groups, rounds, podium, played, total };
}
export type EventView = ReturnType<typeof eventView>;

// ---------------------------------------------------------------------------
// Appel des matchs sur les tables / terrains
// ---------------------------------------------------------------------------

/** Minutes de repos accordées à un joueur qui sort de table avant de le rappeler. */
export const REST_MINUTES = 3;

function playersOf(entryIds: (number | null)[]) {
  const ids = entryIds.filter((x): x is number => x != null);
  if (!ids.length) return [];
  const rows = db.prepare(`SELECT player_id, partner_id FROM entries WHERE id IN (${ids.map(() => "?").join(",")})`).all(...ids) as { player_id: number; partner_id: number | null }[];
  return rows.flatMap((r) => [r.player_id, r.partner_id]).filter((x): x is number => x != null);
}

/** Joueurs actuellement appelés ou en train de jouer (un joueur ne peut pas être sur deux tables). */
export function busyPlayers(tournamentId: number) {
  return new Set(tournamentMatches(tournamentId, "m.status IN ('appele','en_cours')").flatMap((m) => playersOf([m.entry_a, m.entry_b])));
}

export function freeCourts(tournamentId: number) {
  const t = getTournament(tournamentId)!;
  const used = new Set(tournamentMatches(tournamentId, "m.status IN ('appele','en_cours') AND m.court_no IS NOT NULL").map((m) => m.court_no));
  return Array.from({ length: t.courts_count }, (_, i) => i + 1).filter((n) => !used.has(n));
}

export type QueueItem = { m: Match; blocked: boolean; resting: boolean };

/**
 * File d'attente : matchs prêts, du plus ancien au plus récent.
 * Un match dont un joueur est déjà sur une table est bloqué ; un joueur qui vient de jouer passe après les autres.
 */
export function queue(tournamentId: number): QueueItem[] {
  const busy = busyPlayers(tournamentId);
  const order = new Map((db.prepare("SELECT id, position FROM events WHERE tournament_id = ?").all(tournamentId) as { id: number; position: number }[]).map((e) => [e.id, e.position]));
  const lastPlayed = new Map<number, number>();
  for (const m of tournamentMatches(tournamentId, "m.status = 'termine' AND m.outcome = 'normal'"))
    for (const p of playersOf([m.entry_a, m.entry_b])) lastPlayed.set(p, Math.max(lastPlayed.get(p) ?? 0, Date.parse(m.finished_at!)));
  const restLimit = Date.now() - REST_MINUTES * 60_000;
  return tournamentMatches(tournamentId, "m.status = 'pret'")
    .sort((a, b) =>
      (a.ready_at ?? "").localeCompare(b.ready_at ?? "") ||
      (b.round ?? 0) - (a.round ?? 0) ||
      (order.get(a.event_id)! - order.get(b.event_id)!) ||
      (a.group_no ?? 0) - (b.group_no ?? 0) || a.slot - b.slot || a.id - b.id)
    .map((m) => {
      const ps = playersOf([m.entry_a, m.entry_b]);
      return { m, blocked: ps.some((p) => busy.has(p)), resting: ps.some((p) => (lastPlayed.get(p) ?? 0) > restLimit) };
    })
    .sort((x, y) => Number(x.blocked) - Number(y.blocked) || Number(x.resting) - Number(y.resting));
}

export function callMatch(matchId: number, court: number) {
  const m = getMatch(matchId);
  if (!m || m.status !== "pret") throw new Error("Ce match n'est pas prêt à être appelé");
  const ev = getEvent(m.event_id)!;
  if (!freeCourts(ev.tournament_id).includes(court)) throw new Error("Cette table est déjà occupée");
  const busy = busyPlayers(ev.tournament_id);
  if (playersOf([m.entry_a, m.entry_b]).some((p) => busy.has(p))) throw new Error("Un des joueurs est déjà sur une autre table");
  db.prepare("UPDATE matches SET status = 'appele', court_no = ?, called_at = ? WHERE id = ?").run(court, now(), matchId);
}

/** Remplit toutes les tables libres avec les prochains matchs jouables. Renvoie le nombre de matchs appelés. */
export function autoCall(tournamentId: number) {
  let called = 0;
  db.transaction(() => {
    const courts = freeCourts(tournamentId);
    const busy = busyPlayers(tournamentId);
    for (const { m } of queue(tournamentId)) {
      if (!courts.length) break;
      const ps = playersOf([m.entry_a, m.entry_b]);
      if (ps.some((p) => busy.has(p))) continue;
      db.prepare("UPDATE matches SET status = 'appele', court_no = ?, called_at = ? WHERE id = ?").run(courts.shift()!, now(), m.id);
      ps.forEach((p) => busy.add(p));
      called++;
    }
  })();
  return called;
}

/** Le match appelé commence (les joueurs sont à la table). */
export function startMatch(matchId: number) {
  db.prepare("UPDATE matches SET status = 'en_cours', started_at = ? WHERE id = ? AND status = 'appele'").run(now(), matchId);
}

/** Libère la table : le match retourne dans la file d'attente. */
export function releaseCourt(matchId: number) {
  db.prepare("UPDATE matches SET status = 'pret', court_no = NULL, called_at = NULL, started_at = NULL WHERE id = ? AND status IN ('appele','en_cours')").run(matchId);
}
