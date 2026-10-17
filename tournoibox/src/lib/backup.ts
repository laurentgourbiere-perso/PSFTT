import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { db, DATA_DIR, DB_PATH, migrate } from "./db";

// Sauvegardes de la base : automatiques pendant le tournoi, manuelles, restauration et import.

export const BACKUP_DIR = path.join(DATA_DIR, "sauvegardes");
const KEEP_AUTO = 40;          // sauvegardes automatiques conservées (les plus récentes)
const AUTO_EVERY_MS = 2 * 60_000;
const NAME = /^tournoibox-\d{8}-\d{6}-(auto|manuelle|demarrage|avant-restauration|import)\.db$/;

export type Backup = { name: string; date: Date; size: number; kind: string };

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

export function listBackups(): Backup[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((n) => NAME.test(n))
    .map((name) => {
      const st = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, date: st.mtime, size: st.size, kind: name.match(NAME)![1] };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Chemin d'une sauvegarde existante, ou null (protège contre les noms de fichier forgés). */
export function backupPath(name: string) {
  if (!NAME.test(name)) return null;
  const p = path.join(BACKUP_DIR, name);
  return fs.existsSync(p) ? p : null;
}

/** Copie cohérente de la base, même pendant qu'elle est utilisée (API de sauvegarde SQLite). */
export async function backupNow(kind: "auto" | "manuelle" | "demarrage" | "avant-restauration" | "import" = "manuelle") {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  let name = `tournoibox-${stamp()}-${kind}.db`;
  // Deux sauvegardes dans la même seconde : on attend la suivante pour garder un nom unique
  if (fs.existsSync(path.join(BACKUP_DIR, name))) {
    await new Promise((r) => setTimeout(r, 1000));
    name = `tournoibox-${stamp()}-${kind}.db`;
  }
  await db.backup(path.join(BACKUP_DIR, name));
  prune();
  return name;
}

function prune() {
  const autos = listBackups().filter((b) => b.kind === "auto");
  for (const b of autos.slice(KEEP_AUTO)) fs.rmSync(path.join(BACKUP_DIR, b.name), { force: true });
}

/** Vérifie qu'un fichier est bien une base TournoiBox lisible. */
function checkFile(file: string) {
  let probe: Database.Database | undefined;
  try {
    probe = new Database(file, { readonly: true, fileMustExist: true });
    probe.prepare("SELECT COUNT(*) FROM tournaments").get();
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde TournoiBox valide");
  } finally {
    probe?.close();
  }
}

/** Remplace la base par une sauvegarde. La base actuelle est d'abord sauvegardée. */
export async function restoreFrom(file: string) {
  checkFile(file);
  await backupNow("avant-restauration");
  const src = new Database(file, { readonly: true });
  try {
    await src.backup(DB_PATH);
  } finally {
    src.close();
  }
  migrate(db);
}

// Sauvegarde automatique : au démarrage puis toutes les 2 minutes s'il y a eu des modifications
const g = globalThis as unknown as { __tournoiboxBackup?: boolean };
if (!g.__tournoiboxBackup && process.env.NEXT_PHASE !== "phase-production-build") {
  g.__tournoiboxBackup = true;
  const changes = () => (db.prepare("SELECT total_changes() n").get() as { n: number }).n;
  let last = changes();
  const hasData = (db.prepare("SELECT COUNT(*) n FROM tournaments").get() as { n: number }).n > 0;
  if (hasData) backupNow("demarrage").catch(() => {});
  const timer = setInterval(() => {
    const now = changes();
    if (now === last) return;
    last = now;
    backupNow("auto").catch(() => {});
  }, AUTO_EVERY_MS);
  timer.unref();
}
