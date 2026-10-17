"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, getSetting, setSetting } from "@/lib/db";
import { createSession, destroySession, needsSetup, requireOrganizer, tooManyAttempts, recordFailedAttempt } from "@/lib/auth";
import { getTournament, getEvents, getEvent, ineligibility, refreshDue, promoteWaiting, hallFree, type Player } from "@/lib/tournament";
import { sportOf } from "@/lib/sports";

export type FormState = { error?: string; ok?: string } | undefined;

const num = (form: FormData, key = "id") => Number(form.get(key));
const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(min).max(max).optional());

// ---------------------------------------------------------------------------
// Accès organisateur
// ---------------------------------------------------------------------------

const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .max(200);

export async function setupOrganizer(_: FormState, form: FormData): Promise<FormState> {
  if (!needsSetup()) redirect("/connexion");
  const parsed = passwordSchema.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (form.get("password") !== form.get("confirm")) return { error: "Les deux mots de passe ne correspondent pas" };
  setSetting("organizer_hash", await bcrypt.hash(parsed.data, 12));
  await createSession();
  redirect("/");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (tooManyAttempts()) return { error: "Trop d'essais. Patientez une minute." };
  const ok = await bcrypt.compare(String(form.get("password") ?? ""), getSetting("organizer_hash") ?? "");
  if (!ok) {
    recordFailedAttempt();
    return { error: "Mot de passe incorrect" };
  }
  await createSession();
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/connexion");
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  if (!(await bcrypt.compare(String(form.get("current") ?? ""), getSetting("organizer_hash") ?? ""))) return { error: "Mot de passe actuel incorrect" };
  const parsed = passwordSchema.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (form.get("password") !== form.get("confirm")) return { error: "Les deux mots de passe ne correspondent pas" };
  setSetting("organizer_hash", await bcrypt.hash(parsed.data, 12));
  setSetting("sessions_valid_after", String(Date.now() - 1000));
  await createSession();
  return { ok: "Mot de passe modifié" };
}

// ---------------------------------------------------------------------------
// Création et réglages du tournoi
// ---------------------------------------------------------------------------

const tournamentSchema = z.object({
  name: z.string().trim().min(1, "Donnez un nom au tournoi").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  venue: z.string().trim().max(200),
  start_time: z.string().trim().max(5),
  sport: z.string().max(40),
  court_label: z.string().trim().min(1).max(20),
  courts_count: z.coerce.number().int().min(1, "Au moins 1 table / terrain").max(100),
  max_players: optInt(2, 2000),
  max_events: z.coerce.number().int().min(1).max(10),
  price_1: z.coerce.number().min(0).max(1000),
  price_2: z.coerce.number().min(0).max(1000),
  price_double: z.coerce.number().min(0).max(1000),
});

const presetSchema = z.object({
  name: z.string().trim().min(1).max(80),
  is_double: z.boolean().optional(),
  handicap: z.boolean().optional(),
  max_points: z.number().int().optional(),
  under_age: z.number().int().optional(),
  capacity: z.number().int().min(2).max(2000).optional(),
  format: z.enum(["poules", "ko"]).optional(),
  best_of: z.number().int().optional(),
});

export async function createTournament(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const parsed = tournamentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  let presets: z.infer<typeof presetSchema>[];
  try {
    presets = z.array(presetSchema).parse(JSON.parse(String(form.get("events") ?? "[]")));
  } catch {
    return { error: "Tableaux invalides" };
  }
  if (!presets.length) return { error: "Ajoutez au moins un tableau" };
  const year = Number(d.date.slice(0, 4));
  const bestOfDefault = sportOf(d.sport).presets[0]?.best_of ?? 5;
  const id = db.transaction(() => {
    const tid = Number(db.prepare(`INSERT INTO tournaments (name, date, venue, start_time, sport, court_label, courts_count, max_players, max_events, price_1, price_2, price_double)
      VALUES (@name, @date, @venue, @start_time, @sport, @court_label, @courts_count, @max_players, @max_events, @price_1, @price_2, @price_double)`)
      .run({ ...d, max_players: d.max_players ?? null, venue: d.venue || null, start_time: d.start_time || null }).lastInsertRowid);
    const ins = db.prepare(`INSERT INTO events (tournament_id, name, position, is_double, handicap, max_points, min_birth_year, capacity, format, best_of)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    presets.forEach((p, i) =>
      ins.run(tid, p.name, i + 1, p.is_double ? 1 : 0, p.handicap ? 1 : 0, p.max_points ?? null, p.under_age ? year - p.under_age + 1 : null, p.capacity ?? null, p.format ?? "poules", p.best_of ?? bestOfDefault));
    return tid;
  })();
  redirect(`/t/${id}/inscriptions`);
}

export async function updateTournament(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const t = getTournament(num(form))!;
  const parsed = tournamentSchema.safeParse({ ...Object.fromEntries(form), sport: t.sport });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  db.prepare(`UPDATE tournaments SET name=@name, date=@date, venue=@venue, start_time=@start_time, court_label=@court_label, courts_count=@courts_count,
    max_players=@max_players, max_events=@max_events, price_1=@price_1, price_2=@price_2, price_double=@price_double WHERE id=@id`)
    .run({ ...d, id: t.id, max_players: d.max_players ?? null, venue: d.venue || null, start_time: d.start_time || null });
  const nt = getTournament(t.id)!;
  for (const p of db.prepare("SELECT id FROM players WHERE tournament_id = ?").all(t.id) as { id: number }[]) refreshDue(nt, p.id);
  revalidatePath(`/t/${t.id}`, "layout");
  return { ok: "Réglages enregistrés" };
}

export async function deleteTournament(form: FormData) {
  await requireOrganizer();
  if (form.get("confirm") !== "SUPPRIMER") return;
  db.prepare("DELETE FROM tournaments WHERE id = ?").run(num(form));
  redirect("/");
}

const eventSchema = z.object({
  name: z.string().trim().min(1, "Nom du tableau requis").max(80),
  min_points: optInt(0, 100000),
  max_points: optInt(0, 100000),
  min_birth_year: optInt(1900, 2100),
  max_birth_year: optInt(1900, 2100),
  capacity: optInt(2, 2000),
  format: z.enum(["poules", "ko"]),
  group_size: z.coerce.number().int().min(3).max(6),
  qualifiers: z.coerce.number().int().min(1).max(3),
  best_of: z.coerce.number().int().refine((n) => [1, 3, 5, 7].includes(n)),
  start_time: z.string().trim().max(5),
});

export async function saveEvent(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const parsed = eventSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const row = {
    ...d, is_double: form.get("is_double") === "on" ? 1 : 0, handicap: form.get("handicap") === "on" ? 1 : 0,
    min_points: d.min_points ?? null, max_points: d.max_points ?? null, min_birth_year: d.min_birth_year ?? null,
    max_birth_year: d.max_birth_year ?? null, capacity: d.capacity ?? null, start_time: d.start_time || null,
  };
  const eventId = num(form, "event_id");
  let tid: number;
  if (eventId) {
    const ev = getEvent(eventId)!;
    tid = ev.tournament_id;
    db.prepare(`UPDATE events SET name=@name, is_double=@is_double, handicap=@handicap, min_points=@min_points, max_points=@max_points, min_birth_year=@min_birth_year,
      max_birth_year=@max_birth_year, capacity=@capacity, format=@format, group_size=@group_size, qualifiers=@qualifiers, best_of=@best_of, start_time=@start_time WHERE id=@id`).run({ ...row, id: eventId });
    // Places ajoutées : la liste d'attente avance
    for (let i = 0; i < 2000; i++) {
      const before = (db.prepare("SELECT COUNT(*) n FROM entries WHERE event_id = ? AND status = 'attente'").get(eventId) as { n: number }).n;
      promoteWaiting(eventId);
      if ((db.prepare("SELECT COUNT(*) n FROM entries WHERE event_id = ? AND status = 'attente'").get(eventId) as { n: number }).n === before) break;
    }
  } else {
    tid = num(form, "tournament_id");
    const pos = (db.prepare("SELECT IFNULL(MAX(position), 0) + 1 p FROM events WHERE tournament_id = ?").get(tid) as { p: number }).p;
    db.prepare(`INSERT INTO events (tournament_id, name, position, is_double, handicap, min_points, max_points, min_birth_year, max_birth_year, capacity, format, group_size, qualifiers, best_of, start_time)
      VALUES (@tid, @name, @pos, @is_double, @handicap, @min_points, @max_points, @min_birth_year, @max_birth_year, @capacity, @format, @group_size, @qualifiers, @best_of, @start_time)`).run({ ...row, tid, pos });
  }
  revalidatePath(`/t/${tid}`, "layout");
  return { ok: "Tableau enregistré" };
}

export async function deleteEvent(form: FormData) {
  await requireOrganizer();
  const ev = getEvent(num(form))!;
  const t = getTournament(ev.tournament_id)!;
  const players = db.prepare("SELECT player_id, partner_id FROM entries WHERE event_id = ?").all(ev.id) as { player_id: number; partner_id: number | null }[];
  db.prepare("DELETE FROM events WHERE id = ?").run(ev.id);
  for (const p of players) { refreshDue(t, p.player_id); if (p.partner_id) refreshDue(t, p.partner_id); }
  revalidatePath(`/t/${t.id}`, "layout");
}

// ---------------------------------------------------------------------------
// Bureau des inscriptions
// ---------------------------------------------------------------------------

const registrationSchema = z.object({
  tournament_id: z.coerce.number().int(),
  first_name: z.string().trim().min(1, "Prénom requis").max(60),
  last_name: z.string().trim().min(1, "Nom requis").max(60),
  club: z.string().trim().max(80),
  licence: z.string().trim().max(20),
  points: optInt(0, 100000),
  birth_year: optInt(1900, new Date().getFullYear()),
  phone: z.string().trim().max(20),
  partner_first_name: z.string().trim().max(60),
  partner_last_name: z.string().trim().max(60),
  partner_club: z.string().trim().max(80),
  partner_points: optInt(0, 100000),
  payment: z.enum(["", "especes", "cheque", "cb", "offert"]),
});

function findPlayer(tid: number, first: string, last: string) {
  return db.prepare("SELECT * FROM players WHERE tournament_id = ? AND lower(first_name) = lower(?) AND lower(last_name) = lower(?)").get(tid, first, last) as Player | undefined;
}

export async function registerPlayer(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const parsed = registrationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const t = getTournament(d.tournament_id);
  if (!t) return { error: "Tournoi introuvable" };

  const events = getEvents(t.id);
  const chosen = form.getAll("events").map(Number).map((n) => events.find((e) => e.id === n)).filter((e) => e != null);
  if (!chosen.length) return { error: "Choisissez au moins un tableau" };
  if (chosen.some((e) => e.status !== "inscriptions")) return { error: "Un des tableaux a déjà commencé" };
  const singles = chosen.filter((e) => !e.is_double);
  if (singles.length > t.max_events) return { error: `${t.max_events} tableau(x) maximum par joueur, hors double` };
  const me = { points: d.points ?? 500, birth_year: d.birth_year ?? null };
  for (const ev of singles) {
    const why = ineligibility(ev, me);
    if (why) return { error: `${ev.name} : ${why}` };
  }
  const double = chosen.find((e) => e.is_double);
  if (double && (!d.partner_first_name || !d.partner_last_name)) return { error: "Indiquez le partenaire de double" };

  const existing = findPlayer(t.id, d.first_name, d.last_name);
  const newPeople = (existing ? 0 : 1) + (double && !findPlayer(t.id, d.partner_first_name, d.partner_last_name) ? 1 : 0);
  const free = hallFree(t);
  if (free != null && newPeople > free) return { error: `Salle complète : ${t.max_players} joueurs maximum` };

  let waitlisted: string[] = [];
  try {
    db.transaction(() => {
      let playerId: number;
      if (existing) {
        playerId = existing.id;
        db.prepare("UPDATE players SET club = IFNULL(NULLIF(?, ''), club), points = ?, birth_year = IFNULL(?, birth_year), checked_in = 1 WHERE id = ?")
          .run(d.club, me.points, d.birth_year ?? null, playerId);
      } else {
        playerId = Number(db.prepare("INSERT INTO players (tournament_id, first_name, last_name, club, licence, points, birth_year, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .run(t.id, d.first_name, d.last_name, d.club || null, d.licence || null, me.points, d.birth_year ?? null, d.phone || null).lastInsertRowid);
      }
      const already = new Set((db.prepare("SELECT event_id FROM entries WHERE player_id = ? OR partner_id = ?").all(playerId, playerId) as { event_id: number }[]).map((r) => r.event_id));
      const currentSingles = (db.prepare("SELECT COUNT(*) n FROM entries e JOIN events v ON v.id = e.event_id WHERE (e.player_id = ? OR e.partner_id = ?) AND v.is_double = 0").get(playerId, playerId) as { n: number }).n;
      if (currentSingles + singles.filter((e) => !already.has(e.id)).length > t.max_events) throw new Error(`${d.first_name} ${d.last_name} est déjà inscrit dans ${currentSingles} tableau(x) : ${t.max_events} maximum`);

      const enter = (evId: number, partner: number | null) => {
        const ev = getEvent(evId)!;
        const reg = (db.prepare("SELECT COUNT(*) n FROM entries WHERE event_id = ? AND status = 'inscrit'").get(evId) as { n: number }).n;
        const status = ev.capacity != null && reg >= ev.capacity ? "attente" : "inscrit";
        if (status === "attente") waitlisted.push(ev.name);
        db.prepare("INSERT INTO entries (event_id, player_id, partner_id, status) VALUES (?, ?, ?, ?)").run(evId, playerId, partner, status);
      };
      for (const ev of singles) if (!already.has(ev.id)) enter(ev.id, null);

      if (double && !already.has(double.id)) {
        let partner = findPlayer(t.id, d.partner_first_name, d.partner_last_name);
        if (partner) {
          if (db.prepare("SELECT 1 FROM entries WHERE event_id = ? AND (player_id = ? OR partner_id = ?)").get(double.id, partner.id, partner.id))
            throw new Error(`${partner.first_name} ${partner.last_name} a déjà un partenaire en ${double.name}`);
        } else {
          const pid = db.prepare("INSERT INTO players (tournament_id, first_name, last_name, club, points) VALUES (?, ?, ?, ?, ?)")
            .run(t.id, d.partner_first_name, d.partner_last_name, d.partner_club || null, d.partner_points ?? 500).lastInsertRowid;
          partner = db.prepare("SELECT * FROM players WHERE id = ?").get(pid) as Player;
        }
        enter(double.id, partner.id);
        refreshDue(t, partner.id);
      }
      refreshDue(t, playerId);
      if (d.payment) db.prepare("UPDATE players SET amount_paid = CASE WHEN ? = 'offert' THEN 0 ELSE amount_due END, payment_method = ? WHERE id = ?").run(d.payment, d.payment, playerId);
    })();
  } catch (e) {
    waitlisted = [];
    return { error: (e as Error).message };
  }
  revalidatePath(`/t/${t.id}`, "layout");
  const msg = `${d.first_name} ${d.last_name} est inscrit`;
  return { ok: waitlisted.length ? `${msg}, en liste d'attente pour : ${waitlisted.join(", ")}` : msg };
}

export async function withdrawEntry(form: FormData) {
  await requireOrganizer();
  const e = db.prepare("SELECT e.*, v.tournament_id, v.status ev_status FROM entries e JOIN events v ON v.id = e.event_id WHERE e.id = ?").get(num(form)) as
    { event_id: number; player_id: number; partner_id: number | null; tournament_id: number; ev_status: string } | undefined;
  if (!e || e.ev_status !== "inscriptions") return;
  const t = getTournament(e.tournament_id)!;
  db.transaction(() => {
    db.prepare("DELETE FROM entries WHERE id = ?").run(num(form));
    promoteWaiting(e.event_id);
    refreshDue(t, e.player_id);
    if (e.partner_id) refreshDue(t, e.partner_id);
  })();
  revalidatePath(`/t/${t.id}`, "layout");
}

export async function deletePlayer(form: FormData) {
  await requireOrganizer();
  const p = db.prepare("SELECT * FROM players WHERE id = ?").get(num(form)) as Player | undefined;
  if (!p) return;
  const started = db.prepare("SELECT 1 FROM entries e JOIN events v ON v.id = e.event_id WHERE (e.player_id = ? OR e.partner_id = ?) AND v.status != 'inscriptions'").get(p.id, p.id);
  if (started) return;
  const t = getTournament(p.tournament_id)!;
  db.transaction(() => {
    const evs = db.prepare("SELECT event_id, player_id, partner_id FROM entries WHERE player_id = ? OR partner_id = ?").all(p.id, p.id) as { event_id: number; player_id: number; partner_id: number | null }[];
    db.prepare("DELETE FROM players WHERE id = ?").run(p.id);
    for (const e of evs) {
      promoteWaiting(e.event_id);
      const other = e.player_id === p.id ? e.partner_id : e.player_id;
      if (other) refreshDue(t, other);
    }
  })();
  revalidatePath(`/t/${t.id}`, "layout");
}

export async function togglePresence(form: FormData) {
  await requireOrganizer();
  const p = db.prepare("SELECT tournament_id FROM players WHERE id = ?").get(num(form)) as { tournament_id: number };
  db.prepare("UPDATE players SET checked_in = 1 - checked_in WHERE id = ?").run(num(form));
  revalidatePath(`/t/${p.tournament_id}`, "layout");
}

export async function recordPayment(form: FormData) {
  await requireOrganizer();
  const p = db.prepare("SELECT * FROM players WHERE id = ?").get(num(form)) as Player;
  const method = String(form.get("method"));
  if (method === "annuler") db.prepare("UPDATE players SET amount_paid = 0, payment_method = NULL WHERE id = ?").run(p.id);
  else if (method in { especes: 1, cheque: 1, cb: 1, offert: 1 })
    db.prepare("UPDATE players SET amount_paid = ?, payment_method = ? WHERE id = ?").run(method === "offert" ? 0 : p.amount_due, method, p.id);
  revalidatePath(`/t/${p.tournament_id}`, "layout");
}

/** Change l'ordre d'affichage des tableaux (bureau des inscriptions, écrans). */
export async function moveEvent(form: FormData) {
  await requireOrganizer();
  const ev = getEvent(num(form))!;
  const evs = getEvents(ev.tournament_id);
  const i = evs.findIndex((e) => e.id === ev.id);
  const j = form.get("dir") === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= evs.length) return;
  db.prepare("UPDATE events SET position = ? WHERE id = ?").run(evs[j].position, ev.id);
  db.prepare("UPDATE events SET position = ? WHERE id = ?").run(ev.position, evs[j].id);
  if (evs[j].position === ev.position) db.prepare("UPDATE events SET position = position + 1 WHERE id = ?").run(form.get("dir") === "up" ? ev.id : evs[j].id);
  revalidatePath(`/t/${ev.tournament_id}`, "layout");
}
