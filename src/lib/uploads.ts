import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { UPLOAD_DIR } from "./db";

export const MAX_UPLOAD = 5 * 1024 * 1024;
export const FILE_ID = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

// Le type est déduit des premiers octets, pas de l'extension envoyée par le navigateur
function sniff(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 4).toString("hex") === "89504e47") return "png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

export async function saveImage(file: File): Promise<{ id?: string; error?: string }> {
  if (!file || file.size === 0) return { error: "Aucun fichier reçu" };
  if (file.size > MAX_UPLOAD) return { error: "Image trop lourde (5 Mo maximum)" };
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) return { error: "Format non supporté (JPEG, PNG ou WebP uniquement)" };
  const id = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, id), buf);
  return { id };
}

export function deleteImage(id: string | null | undefined) {
  if (!id || !FILE_ID.test(id)) return;
  fs.rmSync(path.join(UPLOAD_DIR, id), { force: true });
}

export function readImage(id: string) {
  if (!FILE_ID.test(id)) return null;
  const file = path.join(UPLOAD_DIR, id);
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}
