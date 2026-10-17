import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Dossier des données : à côté de l'application, ou celui choisi par l'installateur
export const DATA_DIR = process.env.TOURNOIBOX_DATA ?? path.join(process.cwd(), "data");

function open() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "tournoibox.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.join(process.cwd(), "src/lib/schema.sql"), "utf8"));
  return db;
}

// Une seule connexion partagée, conservée entre les rechargements à chaud en dev
const g = globalThis as unknown as { __tournoiboxDb?: Database.Database };
export const db = g.__tournoiboxDb ?? (g.__tournoiboxDb = open());

export function getSetting(key: string) {
  return (db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined)?.value;
}
export function setSetting(key: string, value: string) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}
