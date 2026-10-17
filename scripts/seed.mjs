// Remplit la base locale avec des données de démonstration (joueurs fictifs).
// Usage : npm run seed (si la base est vide) ou npm run reset (repart de zéro)
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA, "psftt.db");
fs.mkdirSync(path.join(DATA, "uploads"), { recursive: true });

if (process.argv.includes("--reset")) {
  for (const f of [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`]) fs.rmSync(f, { force: true });
  for (const f of fs.readdirSync(path.join(DATA, "uploads"))) fs.rmSync(path.join(DATA, "uploads", f));
}

const db = new Database(DB_FILE);
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(process.cwd(), "src/lib/schema.sql"), "utf8"));

if (db.prepare("SELECT COUNT(*) AS n FROM users").get().n > 0) {
  console.log("La base contient déjà des données. Utilisez `npm run reset` pour repartir de zéro.");
  process.exit(0);
}

const DEMO_PASSWORD = "Psftt2025!";
const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const teams = [
  ["PSFTT 1", "Régionale 3", "#e30613"],
  ["PSFTT 2", "Pré-régionale", "#0b3c8c"],
  ["PSFTT 3", "Départementale 1", "#c08a00"],
  ["PSFTT 4", "Départementale 2", "#00a6a6"],
];
const insTeam = db.prepare("INSERT INTO teams (name, division, color) VALUES (?, ?, ?)");
const teamIds = teams.map((t) => insTeam.run(...t).lastInsertRowid);

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const AV = {
  ball: ["#ffffff", "#ff8a00", "#ffd400", "#ff5ea8", "#7cf29c"],
  bg: ["#0b3c8c", "#e30613", "#ffd400", "#141414", "#00a6a6", "#7b2ff7"],
  eyes: ["normal", "happy", "fire", "cool", "wink"],
  mouth: ["smile", "grin", "o", "tongue", "serious"],
  hat: ["none", "headband", "cap", "crown", "sweat"],
};
const avatar = () => JSON.stringify(Object.fromEntries(Object.entries(AV).map(([k, v]) => [k, pick(v)])));

// [prénom, nom, email, rôle, équipe(index), points, surnom, devise, style, main, coup, V, D]
const people = [
  ["Admin", "Club", "admin@psftt.local", "admin", null, 1050, "Le Boss", "Le code, c'est comme le service : il faut qu'il passe.", "polyvalent", "droitier", "Service court", 8, 6],
  ["Claire", "Martin", "bureau@psftt.local", "bureau", 2, 980, "La Trésorière", "Chaque point compte. Chaque euro aussi.", "contreur", "droitier", "Bloc revers", 9, 5],
  ["Hugo", "Bernard", "capitaine@psftt.local", "capitaine", 0, 1720, "Turbo", "Plus vite que la balle.", "attaquant", "gaucher", "Flip revers", 14, 2],
  ["Léa", "Dubois", "adherent@psftt.local", "adherent", 1, 1180, "La Fusée", "Top spin ou rien.", "lifteur", "droitier", "Top coup droit", 11, 4],
  ["Marc", "Petit", null, "adherent", 0, 1560, "Le Mur", "Tu peux frapper, ça revient.", "défenseur", "droitier", "Coupe revers", 12, 3],
  ["Nina", "Roux", null, "adherent", 0, 1490, "Picots", "Bonne chance pour lire mes effets.", "contreur", "gaucher", "Bloc picots", 10, 5],
  ["Yanis", "Moreau", null, "capitaine", 1, 1240, "Capitaine Flip", "On ne lâche rien !", "attaquant", "droitier", "Flip coup droit", 9, 6],
  ["Sophie", "Laurent", null, "adherent", 1, 1090, "Smash Queen", "Lob ? Smash.", "attaquant", "droitier", "Smash", 7, 7],
  ["Paul", "Simon", null, "adherent", 2, 890, "Papy Spin", "40 ans de club et toujours là.", "défenseur", "droitier", "Chop", 6, 6],
  ["Inès", "Michel", null, "adherent", 2, 860, "Mini Pong", "Petite mais costaud.", "lifteur", "gauchère", "Top revers", 8, 4],
  ["Tom", "Garcia", null, "adherent", 3, 640, "Le Bleu", "J'apprends vite.", "polyvalent", "droitier", "Service lifté", 4, 8],
  ["Emma", "Fontaine", null, "adherent", 3, 610, "Effet Boomerang", "Ça tourne !", "lifteur", "droitier", "Service pendulaire", 5, 6],
  ["Lucas", "Girard", null, "adherent", 3, 720, "Pong Pong", "Toujours partant pour la 3e mi-temps.", "attaquant", "droitier", "Top coup droit", 6, 5],
  ["Camille", "Blanc", null, "visiteur", null, null, null, null, null, null, null, 0, 0],
];

const insUser = db.prepare("INSERT INTO users (email, password_hash, first_name, last_name, role, consent_at) VALUES (?, ?, ?, ?, ?, datetime('now'))");
const insProfile = db.prepare(`INSERT INTO profiles (user_id, nickname, motto, play_style, hand, favorite_shot, points, team_id, avatar,
  public_profile, public_photos, social_sharing, show_phone, grip, licence_number, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insStats = db.prepare("INSERT INTO player_stats (user_id, wins, losses, perfs) VALUES (?, ?, ?, ?)");

const ids = [];
people.forEach((p, i) => {
  const [first, last, email, role, team, points, nick, motto, style, hand, shot, w, l] = p;
  const id = insUser.run(email ?? `${first}.${last}@demo.psftt.local`.toLowerCase(), hash, first, last, role).lastInsertRowid;
  ids.push(id);
  const isPublic = i % 4 !== 3 ? 1 : 0; // quelques joueurs gardent leur fiche privée, pour la démo RGPD
  insProfile.run(id, nick, motto, style, hand === "gauchère" ? "gaucher" : hand, shot, points, team == null ? null : teamIds[team], avatar(),
    isPublic, 0, isPublic, 1, i === 5 ? "porte-plume" : "europeenne", role === "visiteur" ? null : String(6900000 + i * 137),
    role === "visiteur" ? null : `Licencié au PSFTT. ${motto ?? ""}`);
  insStats.run(id, w, l, Math.floor(w / 3));
});

// Capitaines
db.prepare("UPDATE teams SET captain_id = ? WHERE id = ?").run(ids[2], teamIds[0]);
db.prepare("UPDATE teams SET captain_id = ? WHERE id = ?").run(ids[6], teamIds[1]);
db.prepare("UPDATE teams SET captain_id = ? WHERE id = ?").run(ids[1], teamIds[2]);
db.prepare("UPDATE teams SET captain_id = ? WHERE id = ?").run(ids[12], teamIds[3]);

// Rencontres : 4 journées passées et 3 à venir, réparties sur les samedis
const opponents = ["TT Tarare", "AL Saint-Romain", "Ping Val de Turdine", "ASUL Villeurbanne", "TT Amplepuis", "CP Lentilly", "Brignais TT", "ESL Lyon", "TT Givors", "Vaugneray Ping", "AS Bully", "TT L'Arbresle"];
const insMatch = db.prepare("INSERT INTO matches (team_id, round, date, opponent, home, score_us, score_them, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
const saturday = (offsetWeeks) => {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7) + offsetWeeks * 7);
  return d.toISOString().slice(0, 10);
};
teamIds.forEach((tid, ti) => {
  for (let r = 1; r <= 7; r++) {
    const past = r <= 4;
    const us = past ? Math.floor(Math.random() * 11) + 3 : null;
    const them = past ? 14 - us : null;
    insMatch.run(tid, r, saturday((r - 5) * 2), opponents[(ti * 3 + r) % opponents.length], r % 2, us, them, r % 2 ? "Gymnase de Pontcharra" : null);
  }
});

// Comptes rendus
const insMeeting = db.prepare("INSERT INTO meetings (title, date, kind, attendees, content, decisions, visibility, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
const insAction = db.prepare("INSERT INTO meeting_actions (meeting_id, label, owner, due_date, done) VALUES (?, ?, ?, ?, ?)");
const m1 = insMeeting.run("Comité de rentrée", saturday(-6), "comite", "Président, trésorière, secrétaire, 4 capitaines",
  "1. Bilan des inscriptions : 48 licenciés, +6 par rapport à l'an dernier.\n2. Engagement de 4 équipes en championnat.\n3. Organisation de la soirée des 40 ans.\n4. Projet de nouveau site internet présenté par Laurent.",
  "Validation de l'engagement de 4 équipes.\nBudget soirée 40 ans : 1 500 € maximum.\nFeu vert pour le prototype du nouveau site.", "bureau", ids[1]).lastInsertRowid;
insAction.run(m1, "Réserver la salle des fêtes pour les 40 ans", "Président", saturday(2), 0);
insAction.run(m1, "Commander les maillots collector 40 ans", "Trésorière", saturday(1), 0);
insAction.run(m1, "Présenter la maquette du site", "Laurent", saturday(0), 1);
const m2 = insMeeting.run("Réunion des capitaines", saturday(-3), "capitaines", "Capitaines des équipes 1 à 4",
  "Point sur la première phase. Rappel : les disponibilités sont à donner au plus tard le mercredi soir.\nCovoiturage à organiser pour les déplacements lointains.",
  "Les compositions seront publiées le jeudi.", "adherents", ids[2]).lastInsertRowid;
insAction.run(m2, "Créer un sondage de disponibilités par journée", "Capitaines", saturday(1), 0);

// Budget
const season = (() => { const d = new Date(); const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${y + 1}`; })();
const insEntry = db.prepare("INSERT INTO budget_entries (date, label, category, amount, season, author_id) VALUES (?, ?, ?, ?, ?, ?)");
[
  ["Cotisations septembre", "Cotisations", 4320],
  ["Licences FFTT", "Licences FFTT", -2150],
  ["Subvention mairie de Pontcharra", "Subventions", 800],
  ["Subvention mairie de Saint-Forgeux", "Subventions", 600],
  ["Sponsor boulangerie (maillots)", "Sponsors", 500],
  ["Engagement des 4 équipes", "Engagements équipes", -360],
  ["Balles et filets", "Matériel", -285.5],
  ["Buvette tournoi de rentrée", "Buvette", 412],
  ["Achats buvette", "Buvette", -148.2],
  ["Défraiements déplacements", "Déplacements", -190],
].forEach(([label, cat, amount], i) => insEntry.run(saturday(-8 + i), label, cat, amount, season, ids[1]));

// Actus
const insNews = db.prepare("INSERT INTO news (title, body, emoji, date) VALUES (?, ?, ?, ?)");
insNews.run("40 ans, ça se fête !", "Soirée anniversaire avec anciens et nouveaux joueurs, expo photos et tournoi des légendes.", "🎂", saturday(-1));
insNews.run("Tournoi de Noël", "Tableaux loisirs, jeunes et doubles surprises. Inscriptions bientôt ouvertes.", "🎄", saturday(-2));
insNews.run("Maillots collector", "Une édition limitée « 40 ans » jaune et bleu est en préparation.", "👕", saturday(-4));

console.log(`Base de démonstration créée : ${DB_FILE}`);
console.log(`Comptes (mot de passe commun : ${DEMO_PASSWORD})`);
console.log("  admin@psftt.local      Administrateur");
console.log("  bureau@psftt.local     Comité");
console.log("  capitaine@psftt.local  Capitaine");
console.log("  adherent@psftt.local   Adhérent");
