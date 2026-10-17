import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

function open() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "psftt.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.join(process.cwd(), "src/lib/schema.sql"), "utf8"));
  return db;
}

// Une seule connexion partagée, conservée entre les rechargements à chaud en dev
const g = globalThis as unknown as { __psfttDb?: Database.Database };
export const db = g.__psfttDb ?? (g.__psfttDb = open());

export function audit(actorId: number | null, action: string, target?: string) {
  db.prepare("INSERT INTO audit_log (actor_id, action, target) VALUES (?, ?, ?)").run(actorId, action, target ?? null);
}
