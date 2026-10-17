"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, audit } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import {
  getTournamentById, getEvents, getEvent, getMatch, ineligibility, eventFill, newRef, refreshDue,
  drawEvent, autoCall, callMatch, closeMatch, parseScore, addPoint, undoPoint, autoAwardPrizes, drawRaffle,
  setsWon, setsToWin, getTournamentMatches, getEntries, type Tournament, type TPlayer,
} from "@/lib/tournament";
import type { FormState } from "./auth";

const id = (form: FormData, key = "id") => Number(form.get(key));
const done = (t: Tournament) => revalidatePath(`/tournoi/${t.slug}`, "layout");

function tournamentOf(eventId: number) {
  return getTournamentById(getEvent(eventId)!.tournament_id)!;
}
function tournamentOfMatch(matchId: number) {
  return tournamentOf(getMatch(matchId)!.event_id);
}

/** Passe le tournoi « en cours » au premier tirage, « terminé » quand tous les tableaux le sont. */
function syncTournamentStatus(t: Tournament) {
  const evs = getEvents(t.id);
  if (evs.length && evs.every((e) => e.status === "termine")) {
    db.prepare("UPDATE tournaments SET status = 'termine' WHERE id = ?").run(t.id);
    autoAwardPrizes(t.id);
  } else if (evs.some((e) => e.status !== "inscriptions")) {
    db.prepare("UPDATE tournaments SET status = 'en_cours' WHERE id = ? AND status != 'termine'").run(t.id);
  }
}

// ---------------------------------------------------------------------------
// Inscription (publique ou sur place)
// ---------------------------------------------------------------------------

const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(min).max(max).optional());

const registrationSchema = z.object({
  tournament_id: z.coerce.number().int(),
  source: z.enum(["public", "gestion"]),
  first_name: z.string().trim().min(1, "Prénom requis").max(60),
  last_name: z.string().trim().min(1, "Nom requis").max(60),
  email: z.union([z.literal(""), z.string().trim().email("Adresse e-mail invalide")]),
  phone: z.string().trim().max(20),
  club: z.string().trim().max(80),
  licence: z.string().trim().max(20),
  points: optInt(500, 4000),
  birth_year: optInt(1920, new Date().getFullYear()),
  partner_first_name: z.string().trim().max(60),
  partner_last_name: z.string().trim().max(60),
  partner_club: z.string().trim().max(80),
  partner_licence: z.string().trim().max(20),
  partner_points: optInt(500, 4000),
  consent: z.literal("on", { error: "Merci d'accepter l'affichage de votre nom et de vos résultats" }),
});

function findPlayer(tid: number, first: string, last: string, licence: string) {
  return (licence
    ? db.prepare("SELECT * FROM tournament_players WHERE tournament_id = ? AND licence = ?").get(tid, licence)
    : undefined) as TPlayer | undefined
    ?? db.prepare("SELECT * FROM tournament_players WHERE tournament_id = ? AND lower(first_name) = lower(?) AND lower(last_name) = lower(?)").get(tid, first, last) as TPlayer | undefined;
}

export async function registerPlayer(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registrationSchema.safeParse({ ...Object.fromEntries(form), consent: form.get("consent") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const user = await getCurrentUser();
  const staff = d.source === "gestion";
  if (staff) await requireUser("bureau");

  const t = getTournamentById(d.tournament_id);
  if (!t) return { error: "Tournoi introuvable" };
  if (!staff && t.status !== "inscriptions") return { error: "Les inscriptions en ligne sont fermées : inscrivez-vous sur place." };
  if (!d.email && !staff) return { error: "Adresse e-mail requise pour recevoir votre confirmation" };

  const events = getEvents(t.id);
  const chosen = form.getAll("events").map(Number).map((n) => events.find((e) => e.id === n)).filter((e) => e != null);
  if (!chosen.length) return { error: "Choisissez au moins un tableau" };
  if (chosen.some((e) => e.status !== "inscriptions")) return { error: "Un des tableaux choisis a déjà commencé" };
  const singles = chosen.filter((e) => !e.is_double);
  if (singles.length > t.max_events) return { error: `${t.max_events} tableaux maximum (hors double)` };

  const points = d.points ?? 500;
  const me = { points, birth_year: d.birth_year ?? null };
  for (const ev of singles) {
    const why = ineligibility(ev, me);
    if (why) return { error: why };
  }
  const double = chosen.find((e) => e.is_double);
  if (double && (!d.partner_first_name || !d.partner_last_name)) return { error: "Indiquez le nom de votre partenaire de double" };

  const existing = findPlayer(t.id, d.first_name, d.last_name, d.licence);
  // Un joueur déjà inscrit par son partenaire de double complète sa fiche ; sinon c'est un doublon
  if (existing && !(existing.registered_by && !existing.email)) {
    return { error: staff ? `${d.first_name} ${d.last_name} est déjà inscrit (réservation ${existing.ref}).` : "Vous êtes déjà inscrit à ce tournoi. Retrouvez votre réservation grâce au lien reçu, ou contactez le club." };
  }

  let ref = "";
  try {
    db.transaction(() => {
      let playerId: number;
      if (existing) {
        db.prepare("UPDATE tournament_players SET email = ?, phone = ?, club = ?, licence = ?, points = ?, birth_year = ?, user_id = IFNULL(user_id, ?), registered_by = NULL WHERE id = ?")
          .run(d.email || null, d.phone || null, d.club || null, d.licence || null, points, d.birth_year ?? null, user?.id ?? null, existing.id);
        playerId = existing.id;
        ref = existing.ref;
      } else {
        ref = newRef();
        playerId = Number(db.prepare(`INSERT INTO tournament_players (tournament_id, user_id, first_name, last_name, email, phone, club, licence, points, birth_year, ref, checked_in)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(t.id, staff ? null : user?.id ?? null, d.first_name, d.last_name, d.email || null, d.phone || null, d.club || null, d.licence || null, points, d.birth_year ?? null, ref, staff ? 1 : 0).lastInsertRowid);
      }
      const already = new Set((db.prepare("SELECT event_id FROM tournament_entries WHERE player_id = ? OR partner_id = ?").all(playerId, playerId) as { event_id: number }[]).map((r) => r.event_id));
      const enter = (evId: number, cap: number | null, partner: number | null) => {
        const status = cap != null && eventFill(evId) >= cap ? "attente" : "inscrit";
        db.prepare("INSERT INTO tournament_entries (event_id, player_id, partner_id, status) VALUES (?, ?, ?, ?)").run(evId, playerId, partner, status);
      };
      for (const ev of singles) if (!already.has(ev.id)) enter(ev.id, ev.capacity, null);

      if (double && !already.has(double.id)) {
        let partner = findPlayer(t.id, d.partner_first_name, d.partner_last_name, d.partner_licence);
        if (partner) {
          const taken = db.prepare("SELECT 1 FROM tournament_entries WHERE event_id = ? AND (player_id = ? OR partner_id = ?)").get(double.id, partner.id, partner.id);
          if (taken) throw new Error(`${partner.first_name} ${partner.last_name} a déjà un partenaire en double`);
        } else {
          const pid = db.prepare(`INSERT INTO tournament_players (tournament_id, first_name, last_name, club, licence, points, ref, registered_by, checked_in)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(t.id, d.partner_first_name, d.partner_last_name, d.partner_club || null, d.partner_licence || null, d.partner_points ?? 500, newRef(), playerId, staff ? 1 : 0).lastInsertRowid;
          partner = db.prepare("SELECT * FROM tournament_players WHERE id = ?").get(pid) as TPlayer;
        }
        enter(double.id, double.capacity, partner.id);
        refreshDue(t, partner.id);
      }
      refreshDue(t, playerId);
    })();
  } catch (e) {
    return { error: (e as Error).message };
  }
  done(t);
  if (staff) return { ok: `${d.first_name} ${d.last_name} inscrit et pointé (réservation ${ref})` };
  redirect(`/tournoi/${t.slug}/reservation/${ref}`);
}

/**
 * Paiement en ligne. Prototype : le paiement est simulé.
 * En production, rediriger vers HelloAsso (ou Stripe) puis valider via leur notification de paiement.
 */
export async function payOnline(form: FormData) {
  const ref = String(form.get("ref"));
  const p = db.prepare("SELECT p.*, t.slug FROM tournament_players p JOIN tournaments t ON t.id = p.tournament_id WHERE ref = ?").get(ref) as (TPlayer & { slug: string }) | undefined;
  if (!p) return;
  db.prepare("UPDATE tournament_players SET amount_paid = amount_due, payment_method = 'en_ligne', paid_at = datetime('now') WHERE id = ?").run(p.id);
  revalidatePath(`/tournoi/${p.slug}`, "layout");
  redirect(`/tournoi/${p.slug}/reservation/${ref}?paye=1`);
}

/** Désinscription par le joueur depuis son récapitulatif (avant le début du tableau). */
export async function cancelEntryByPlayer(form: FormData) {
  const ref = String(form.get("ref"));
  const p = db.prepare("SELECT * FROM tournament_players WHERE ref = ?").get(ref) as TPlayer | undefined;
  if (!p) return;
  const entry = db.prepare("SELECT e.id, v.status FROM tournament_entries e JOIN tournament_events v ON v.id = e.event_id WHERE e.id = ? AND (e.player_id = ? OR e.partner_id = ?)").get(id(form, "entry"), p.id, p.id) as { id: number; status: string } | undefined;
  if (!entry || entry.status !== "inscriptions") return;
  withdraw(entry.id);
  const t = getTournamentById(p.tournament_id)!;
  done(t);
}

function withdraw(entryId: number) {
  const e = db.prepare("SELECT * FROM tournament_entries WHERE id = ?").get(entryId) as { event_id: number; player_id: number; partner_id: number | null; status: string };
  const ev = getEvent(e.event_id)!;
  // Après le tirage, un abandon se gère en déclarant le joueur forfait sur ses matchs
  if (ev.status !== "inscriptions") return;
  const t = getTournamentById(ev.tournament_id)!;
  db.transaction(() => {
    db.prepare("DELETE FROM tournament_entries WHERE id = ?").run(entryId);
    // Une place se libère : le premier de la liste d'attente est inscrit
    if (e.status === "inscrit") {
      const next = db.prepare("SELECT id FROM tournament_entries WHERE event_id = ? AND status = 'attente' ORDER BY id LIMIT 1").get(ev.id) as { id: number } | undefined;
      if (next) db.prepare("UPDATE tournament_entries SET status = 'inscrit' WHERE id = ?").run(next.id);
    }
    refreshDue(t, e.player_id);
    if (e.partner_id) refreshDue(t, e.partner_id);
  })();
}

// ---------------------------------------------------------------------------
// Table de marque : pointage, paiements
// ---------------------------------------------------------------------------

export async function toggleCheckIn(form: FormData) {
  await requireUser("bureau");
  const p = db.prepare("SELECT * FROM tournament_players WHERE id = ?").get(id(form)) as TPlayer;
  db.prepare("UPDATE tournament_players SET checked_in = 1 - checked_in WHERE id = ?").run(p.id);
  done(getTournamentById(p.tournament_id)!);
}

export async function recordPayment(form: FormData) {
  const user = await requireUser("bureau");
  const p = db.prepare("SELECT * FROM tournament_players WHERE id = ?").get(id(form)) as TPlayer;
  const method = String(form.get("method"));
  if (method === "annuler") {
    db.prepare("UPDATE tournament_players SET amount_paid = 0, payment_method = NULL, paid_at = NULL WHERE id = ?").run(p.id);
  } else {
    db.prepare("UPDATE tournament_players SET amount_paid = ?, payment_method = ?, paid_at = datetime('now'), checked_in = 1 WHERE id = ?")
      .run(method === "offert" ? 0 : p.amount_due, method, p.id);
  }
  audit(user.id, `tournoi.paiement.${method}`, `joueur:${p.id}`);
  done(getTournamentById(p.tournament_id)!);
}

export async function withdrawEntry(form: FormData) {
  await requireUser("bureau");
  const t = tournamentOf((db.prepare("SELECT event_id FROM tournament_entries WHERE id = ?").get(id(form)) as { event_id: number }).event_id);
  withdraw(id(form));
  done(t);
}

export async function deletePlayer(form: FormData) {
  const user = await requireUser("bureau");
  const p = db.prepare("SELECT * FROM tournament_players WHERE id = ?").get(id(form)) as TPlayer;
  const t = getTournamentById(p.tournament_id)!;
  const drawn = db.prepare("SELECT 1 FROM tournament_entries e JOIN tournament_events v ON v.id = e.event_id WHERE (e.player_id = ? OR e.partner_id = ?) AND v.status != 'inscriptions'").get(p.id, p.id);
  if (drawn) return; // déjà dans un tableau tiré au sort : le déclarer forfait plutôt
  for (const e of db.prepare("SELECT id FROM tournament_entries WHERE player_id = ? OR partner_id = ?").all(p.id, p.id) as { id: number }[]) withdraw(e.id);
  db.prepare("DELETE FROM tournament_players WHERE id = ?").run(p.id);
  audit(user.id, "tournoi.suppression_joueur", `joueur:${p.id}`);
  done(t);
}

// ---------------------------------------------------------------------------
// Juge-arbitre : tirage, appels, scores
// ---------------------------------------------------------------------------

export async function drawEventAction(_: FormState, form: FormData): Promise<FormState> {
  await requireUser("bureau");
  const t = tournamentOf(id(form));
  try {
    drawEvent(id(form), { includeAbsent: form.get("absents") === "on" });
  } catch (e) {
    return { error: (e as Error).message };
  }
  syncTournamentStatus(t);
  done(t);
  return { ok: "Tirage effectué" };
}

export async function autoCallAction(form: FormData) {
  await requireUser("bureau");
  const t = getTournamentById(id(form))!;
  autoCall(t);
  done(t);
}

export async function callMatchAction(form: FormData) {
  await requireUser("bureau");
  const t = tournamentOfMatch(id(form));
  callMatch(id(form), id(form, "table"));
  done(t);
}

export async function cancelCall(form: FormData) {
  await requireUser("bureau");
  const t = tournamentOfMatch(id(form));
  db.prepare("UPDATE tournament_matches SET status = 'pret', table_no = NULL, called_at = NULL, started_at = NULL, sets = '[]' WHERE id = ? AND status IN ('appele','en_cours')").run(id(form));
  db.prepare("DELETE FROM tournament_points WHERE match_id = ?").run(id(form));
  done(t);
}

export async function startMatch(form: FormData) {
  await requireUser("adherent");
  const t = tournamentOfMatch(id(form));
  db.prepare("UPDATE tournament_matches SET status = 'en_cours', started_at = datetime('now') WHERE id = ? AND status = 'appele'").run(id(form));
  done(t);
}

export async function recordScore(_: FormState, form: FormData): Promise<FormState> {
  await requireUser("bureau");
  const m = getMatch(id(form));
  if (!m || !m.entry_a || !m.entry_b) return { error: "Match introuvable" };
  if (m.status === "termine") return { error: "Match déjà terminé" };
  const ev = getEvent(m.event_id)!;
  const t = tournamentOf(ev.id);
  const outcome = String(form.get("outcome") ?? "normal");
  try {
    if (outcome === "forfait_a" || outcome === "forfait_b") {
      closeMatch(m.id, outcome === "forfait_a" ? m.entry_b : m.entry_a, "forfait", []);
    } else {
      const sets = parseScore(String(form.get("score") ?? ""), ev.best_of);
      const [a] = setsWon({ ...m, sets });
      closeMatch(m.id, a === setsToWin(ev.best_of) ? m.entry_a : m.entry_b, "normal", sets);
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  syncTournamentStatus(t);
  done(t);
  return { ok: "Score enregistré" };
}

/** Score en direct depuis la table (bénévole adhérent). */
export async function scorePoint(form: FormData) {
  await requireUser("adherent");
  const m = getMatch(id(form))!;
  const t = tournamentOf(m.event_id);
  const side = String(form.get("side"));
  if (side === "undo") undoPoint(m.id);
  else addPoint(m.id, side === "a" ? "a" : "b");
  syncTournamentStatus(t);
  done(t);
}

// ---------------------------------------------------------------------------
// Réglages du tournoi et des tableaux
// ---------------------------------------------------------------------------

const tournamentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().trim().max(200),
  start_time: z.string().trim().max(5),
  checkin_time: z.string().trim().max(5),
  description: z.string().trim().max(3000),
  sponsors: z.string().trim().max(1000),
  status: z.enum(["brouillon", "inscriptions", "en_cours", "termine"]),
  max_events: z.coerce.number().int().min(1).max(10),
  price_1: z.coerce.number().min(0).max(1000),
  price_2: z.coerce.number().min(0).max(1000),
  price_double: z.coerce.number().min(0).max(1000),
  tables_count: z.coerce.number().int().min(1).max(60),
});

export async function updateTournament(_: FormState, form: FormData): Promise<FormState> {
  await requireUser("bureau");
  const t = getTournamentById(id(form))!;
  const parsed = tournamentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: `${parsed.error.issues[0].path.join(".")} : ${parsed.error.issues[0].message}` };
  const d = parsed.data;
  db.prepare(`UPDATE tournaments SET name=@name, date=@date, venue=@venue, start_time=@start_time, checkin_time=@checkin_time, description=@description,
    sponsors=@sponsors, status=@status, max_events=@max_events, price_1=@price_1, price_2=@price_2, price_double=@price_double, tables_count=@tables_count WHERE id=@id`).run({ ...d, id: t.id });
  // Les tarifs ont pu changer : on recalcule ce que chacun doit
  for (const p of db.prepare("SELECT id FROM tournament_players WHERE tournament_id = ?").all(t.id) as { id: number }[]) refreshDue(getTournamentById(t.id)!, p.id);
  done(t);
  return { ok: "Tournoi enregistré" };
}

const eventSchema = z.object({
  name: z.string().trim().min(1, "Nom du tableau requis").max(80),
  is_double: z.coerce.boolean(),
  handicap: z.coerce.boolean(),
  min_points: optInt(0, 4000),
  max_points: optInt(0, 4000),
  min_birth_year: optInt(1900, 2100),
  capacity: optInt(2, 512),
  format: z.enum(["poules", "ko"]),
  group_size: z.coerce.number().int().min(3).max(6),
  qualifiers: z.coerce.number().int().min(1).max(3),
  best_of: z.coerce.number().int().refine((n) => [3, 5, 7].includes(n)),
  start_time: z.string().trim().max(5),
});

export async function saveEvent(_: FormState, form: FormData): Promise<FormState> {
  await requireUser("bureau");
  const parsed = eventSchema.safeParse({ ...Object.fromEntries(form), is_double: form.get("is_double") === "on", handicap: form.get("handicap") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = { ...parsed.data, is_double: Number(parsed.data.is_double), handicap: Number(parsed.data.handicap) };
  const nullable = { min_points: d.min_points ?? null, max_points: d.max_points ?? null, min_birth_year: d.min_birth_year ?? null, capacity: d.capacity ?? null };
  const eventId = id(form, "event_id");
  let t: Tournament;
  if (eventId) {
    const ev = getEvent(eventId)!;
    t = getTournamentById(ev.tournament_id)!;
    db.prepare(`UPDATE tournament_events SET name=@name, is_double=@is_double, handicap=@handicap, min_points=@min_points, max_points=@max_points, min_birth_year=@min_birth_year,
      capacity=@capacity, format=@format, group_size=@group_size, qualifiers=@qualifiers, best_of=@best_of, start_time=@start_time WHERE id=@id`).run({ ...d, ...nullable, id: eventId });
  } else {
    t = getTournamentById(id(form, "tournament_id"))!;
    const pos = (db.prepare("SELECT IFNULL(MAX(position), 0) + 1 p FROM tournament_events WHERE tournament_id = ?").get(t.id) as { p: number }).p;
    db.prepare(`INSERT INTO tournament_events (tournament_id, name, position, is_double, handicap, min_points, max_points, min_birth_year, capacity, format, group_size, qualifiers, best_of, start_time)
      VALUES (@tid, @name, @pos, @is_double, @handicap, @min_points, @max_points, @min_birth_year, @capacity, @format, @group_size, @qualifiers, @best_of, @start_time)`).run({ ...d, ...nullable, tid: t.id, pos });
  }
  done(t);
  return { ok: "Tableau enregistré" };
}

export async function deleteEvent(form: FormData) {
  await requireUser("bureau");
  const ev = getEvent(id(form))!;
  const t = getTournamentById(ev.tournament_id)!;
  const players = db.prepare("SELECT player_id, partner_id FROM tournament_entries WHERE event_id = ?").all(ev.id) as { player_id: number; partner_id: number | null }[];
  db.prepare("DELETE FROM tournament_events WHERE id = ?").run(ev.id);
  for (const p of players) { refreshDue(t, p.player_id); if (p.partner_id) refreshDue(t, p.partner_id); }
  done(t);
}

/** Prépare l'édition suivante : mêmes tableaux, tarifs et lots, sans joueurs. */
export async function duplicateTournament(form: FormData) {
  await requireUser("bureau");
  const t = getTournamentById(id(form))!;
  const d = new Date(t.date);
  d.setFullYear(d.getFullYear() + 1);
  const edition = t.name.match(/^(\d+)/);
  const name = edition ? t.name.replace(/^\d+/, String(Number(edition[1]) + 1)) : `${t.name} (${d.getFullYear()})`;
  let slug = `${t.slug.replace(/-\d{4}$/, "")}-${d.getFullYear()}`;
  while (db.prepare("SELECT 1 FROM tournaments WHERE slug = ?").get(slug)) slug += "-bis";
  const newId = db.transaction(() => {
    const nid = Number(db.prepare(`INSERT INTO tournaments (slug, name, date, venue, start_time, checkin_time, description, sponsors, status, max_events, price_1, price_2, price_double, tables_count)
      SELECT ?, ?, ?, venue, start_time, checkin_time, description, sponsors, 'brouillon', max_events, price_1, price_2, price_double, tables_count FROM tournaments WHERE id = ?`)
      .run(slug, name, d.toISOString().slice(0, 10), t.id).lastInsertRowid);
    for (const ev of getEvents(t.id)) {
      const eid = db.prepare(`INSERT INTO tournament_events (tournament_id, name, position, is_double, handicap, min_points, max_points, min_birth_year, capacity, format, group_size, qualifiers, best_of, start_time)
        SELECT ?, name, position, is_double, handicap, min_points, max_points, min_birth_year + 1, capacity, format, group_size, qualifiers, best_of, start_time FROM tournament_events WHERE id = ?`).run(nid, ev.id).lastInsertRowid;
      db.prepare("INSERT INTO tournament_prizes (tournament_id, event_id, rank, label, value, sponsor) SELECT ?, ?, rank, label, value, sponsor FROM tournament_prizes WHERE event_id = ?").run(nid, eid, ev.id);
    }
    db.prepare("INSERT INTO tournament_prizes (tournament_id, event_id, rank, label, value, sponsor) SELECT ?, NULL, NULL, label, value, sponsor FROM tournament_prizes WHERE tournament_id = ? AND event_id IS NULL").run(nid, t.id);
    return nid;
  })();
  const nt = getTournamentById(newId)!;
  revalidatePath("/tournoi");
  redirect(`/tournoi/${nt.slug}/gestion`);
}

/** Reporte les inscriptions encaissées dans le budget du club (catégorie Tournoi). */
export async function exportToBudget(form: FormData) {
  const user = await requireUser("bureau");
  const t = getTournamentById(id(form))!;
  const total = (db.prepare("SELECT IFNULL(SUM(amount_paid), 0) s FROM tournament_players WHERE tournament_id = ?").get(t.id) as { s: number }).s;
  if (total <= 0) return;
  const y = Number(t.date.slice(0, 4)), month = Number(t.date.slice(5, 7));
  const season = month >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  const label = `Inscriptions ${t.name}`;
  db.prepare("DELETE FROM budget_entries WHERE label = ? AND category = 'Tournoi'").run(label);
  db.prepare("INSERT INTO budget_entries (date, label, category, amount, season, author_id) VALUES (?, ?, 'Tournoi', ?, ?, ?)").run(t.date, label, total, season, user.id);
  revalidatePath("/comite/budget");
  redirect(`/comite/budget?saison=${season}`);
}

// ---------------------------------------------------------------------------
// Lots
// ---------------------------------------------------------------------------

const prizeSchema = z.object({
  tournament_id: z.coerce.number().int(),
  event_id: optInt(1, 1e9),
  rank: optInt(1, 16),
  label: z.string().trim().min(1, "Description du lot requise").max(120),
  value: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).max(100000).optional()),
  sponsor: z.string().trim().max(80),
  quantity: z.coerce.number().int().min(1).max(20),
});

export async function addPrize(_: FormState, form: FormData): Promise<FormState> {
  await requireUser("bureau");
  const parsed = prizeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const t = getTournamentById(d.tournament_id)!;
  const ins = db.prepare("INSERT INTO tournament_prizes (tournament_id, event_id, rank, label, value, sponsor) VALUES (?, ?, ?, ?, ?, ?)");
  for (let i = 0; i < d.quantity; i++) ins.run(t.id, d.event_id ?? null, d.event_id ? d.rank ?? 1 : null, d.label, d.value ?? null, d.sponsor || null);
  if (t.status === "termine" || getEvents(t.id).some((e) => e.status === "termine")) autoAwardPrizes(t.id);
  done(t);
  return { ok: d.quantity > 1 ? `${d.quantity} lots ajoutés` : "Lot ajouté" };
}

function prizeTournament(prizeId: number) {
  return getTournamentById((db.prepare("SELECT tournament_id FROM tournament_prizes WHERE id = ?").get(prizeId) as { tournament_id: number }).tournament_id)!;
}

export async function deletePrize(form: FormData) {
  await requireUser("bureau");
  const t = prizeTournament(id(form));
  db.prepare("DELETE FROM tournament_prizes WHERE id = ?").run(id(form));
  done(t);
}

export async function togglePrizeHanded(form: FormData) {
  await requireUser("bureau");
  const t = prizeTournament(id(form));
  db.prepare("UPDATE tournament_prizes SET handed_at = CASE WHEN handed_at IS NULL THEN datetime('now') ELSE NULL END WHERE id = ? AND (winner_entry IS NOT NULL OR winner_player IS NOT NULL)").run(id(form));
  done(t);
}

export async function awardPrizesAction(form: FormData) {
  await requireUser("bureau");
  const t = getTournamentById(id(form))!;
  autoAwardPrizes(t.id);
  done(t);
}

export async function drawRaffleAction(form: FormData) {
  await requireUser("bureau");
  const t = prizeTournament(id(form));
  try { drawRaffle(id(form)); } catch { /* aucun joueur disponible : rien à faire */ }
  done(t);
}

// ---------------------------------------------------------------------------
// Outils de démonstration (prototype)
// ---------------------------------------------------------------------------

const FIRST = ["Lucas", "Emma", "Hugo", "Chloé", "Louis", "Manon", "Jules", "Camille", "Nathan", "Sarah", "Théo", "Inès", "Raphaël", "Jade", "Arthur", "Lina", "Maël", "Zoé", "Noah", "Léna", "Ethan", "Alice", "Sacha", "Rose", "Gabin", "Lou", "Timéo", "Anna", "Robin", "Margot", "Axel", "Clara", "Enzo", "Eva", "Bastien", "Julie", "Mathis", "Pauline", "Victor", "Élise"];
const LAST = ["Girard", "Bonnet", "Dupont", "Lambert", "Fontaine", "Rousseau", "Vincent", "Muller", "Lefèvre", "Faure", "André", "Mercier", "Blanc", "Guérin", "Boyer", "Garnier", "Chevalier", "François", "Legrand", "Gauthier", "Perrin", "Robin", "Clément", "Morin", "Nicolas", "Henry", "Roussel", "Mathieu", "Gautier", "Masson"];
const CLUBS = ["PSFTT", "TT Tarare", "AL Saint-Romain", "Amplepuis TT", "TT L'Arbresle", "Villefranche TT", "Lozanne TT", "Non licencié"];

export async function demoRegistrations(form: FormData) {
  await requireUser("bureau");
  const t = getTournamentById(id(form))!;
  const events = getEvents(t.id).filter((e) => e.status === "inscriptions");
  const rnd = (n: number) => Math.floor(Math.random() * n);
  const year = Number(t.date.slice(0, 4));
  db.transaction(() => {
    for (let i = 0; i < 40; i++) {
      const young = i % 4 === 0;
      const club = CLUBS[rnd(CLUBS.length)];
      const points = club === "Non licencié" ? 500 : young ? 500 + rnd(500) : 500 + rnd(1500);
      const birth = young ? year - 10 - rnd(5) : year - 18 - rnd(45);
      const [fn, ln] = [FIRST[rnd(FIRST.length)], LAST[rnd(LAST.length)]];
      if (db.prepare("SELECT 1 FROM tournament_players WHERE tournament_id = ? AND first_name = ? AND last_name = ?").get(t.id, fn, ln)) continue;
      const pid = Number(db.prepare(`INSERT INTO tournament_players (tournament_id, first_name, last_name, email, club, licence, points, birth_year, ref, checked_in)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(t.id, fn, ln, `demo${i}@exemple.test`, club === "Non licencié" ? null : club, club === "Non licencié" ? null : `69${100000 + rnd(899999)}`, points, birth, newRef(), Math.random() < 0.9 ? 1 : 0).lastInsertRowid);
      const ok = shuffleArr(events.filter((e) => !e.is_double && !ineligibility(e, { points, birth_year: birth }))).slice(0, 1 + rnd(t.max_events));
      for (const ev of ok) db.prepare("INSERT INTO tournament_entries (event_id, player_id, status) VALUES (?, ?, ?)").run(ev.id, pid, ev.capacity && eventFill(ev.id) >= ev.capacity ? "attente" : "inscrit");
      refreshDue(t, pid);
      if (Math.random() < 0.55) db.prepare("UPDATE tournament_players SET amount_paid = amount_due, payment_method = ?, paid_at = datetime('now') WHERE id = ?").run(["en_ligne", "especes", "cheque", "cb"][rnd(4)], pid);
    }
    // Doubles formés au hasard parmi les inscrits
    const dbl = events.find((e) => e.is_double);
    if (dbl) {
      const free = shuffleArr(db.prepare("SELECT id FROM tournament_players WHERE tournament_id = ? AND id NOT IN (SELECT player_id FROM tournament_entries WHERE event_id = ?) AND id NOT IN (SELECT partner_id FROM tournament_entries WHERE event_id = ? AND partner_id IS NOT NULL)").all(t.id, dbl.id, dbl.id) as { id: number }[]);
      for (let i = 0; i + 1 < Math.min(free.length, 24); i += 2) {
        db.prepare("INSERT INTO tournament_entries (event_id, player_id, partner_id) VALUES (?, ?, ?)").run(dbl.id, free[i].id, free[i + 1].id);
        refreshDue(t, free[i].id); refreshDue(t, free[i + 1].id);
      }
    }
  })();
  done(t);
}

function shuffleArr<T>(a: T[]) {
  return a.map((x) => [Math.random(), x] as const).sort((x, y) => x[0] - y[0]).map(([, x]) => x);
}

/** Simule la fin des matchs en cours (score réaliste), puis rappelle des matchs sur les tables libérées. */
export async function demoPlayRound(form: FormData) {
  await requireUser("bureau");
  const t = getTournamentById(id(form))!;
  autoCall(t);
  const playing = getTournamentMatches(t.id, "m.status IN ('appele','en_cours')");
  for (const m of playing) {
    const ev = getEvent(m.event_id)!;
    const entries = getEntries(ev.id);
    const pa = entries.find((e) => e.id === m.entry_a)!.points, pb = entries.find((e) => e.id === m.entry_b)!.points;
    const pA = 1 / (1 + Math.pow(10, (pb - pa) / 600)); // le mieux classé gagne plus souvent
    const need = setsToWin(ev.best_of);
    const sets: number[][] = [];
    let a = 0, b = 0;
    while (a < need && b < need) {
      const aWins = Math.random() < pA;
      const lose = Math.random() < 0.2 ? 10 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 10);
      const win = lose >= 10 ? lose + 2 : 11;
      sets.push(aWins ? [win, lose] : [lose, win]);
      aWins ? a++ : b++;
    }
    closeMatch(m.id, a === need ? m.entry_a! : m.entry_b!, "normal", sets);
  }
  autoCall(t);
  syncTournamentStatus(t);
  done(t);
}
