import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, DATA_DIR } from "./db";
import { hasRole, type Role } from "./roles";

const COOKIE = "psftt_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 jours

function secret() {
  let s = process.env.PSFTT_SECRET;
  if (!s) {
    const file = path.join(DATA_DIR, ".secret");
    if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString("hex"), { mode: 0o600 });
    s = fs.readFileSync(file, "utf8").trim();
  }
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
};

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userId);
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = db
      .prepare("SELECT id, email, first_name, last_name, role FROM users WHERE id = ?")
      .get(payload.uid) as SessionUser | undefined;
    return user ?? null;
  } catch {
    return null;
  }
}

export async function requireUser(min: Role = "visiteur") {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (!hasRole(user.role, min)) redirect("/acces-refuse");
  return user;
}
