import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import crypto from "node:crypto";
import { getSetting, setSetting } from "./db";

const COOKIE = "tournoibox_session";
const MAX_AGE = 60 * 60 * 14; // une journée de tournoi

function secret() {
  let s = getSetting("session_secret");
  if (!s) {
    s = crypto.randomBytes(48).toString("hex");
    setSetting("session_secret", s);
  }
  return new TextEncoder().encode(s);
}

/** Vrai tant que le mot de passe organisateur n'a pas été choisi (premier lancement). */
export function needsSetup() {
  return !getSetting("organizer_hash");
}

export async function createSession() {
  const token = await new SignJWT({ role: "organisateur" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "strict", path: "/", maxAge: MAX_AGE });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function isOrganizer() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    // Un changement de mot de passe invalide les sessions ouvertes avant
    const since = Number(getSetting("sessions_valid_after") ?? 0);
    return payload.role === "organisateur" && (payload.iat ?? 0) * 1000 >= since;
  } catch {
    return false;
  }
}

/** Pages et actions réservées à l'organisateur. */
export async function requireOrganizer() {
  if (needsSetup()) redirect("/bienvenue");
  if (!(await isOrganizer())) redirect("/connexion");
}

// Limitation des essais de mot de passe (protection contre un curieux devant le PC)
const attempts: number[] = [];
export function tooManyAttempts() {
  const now = Date.now();
  while (attempts.length && attempts[0] < now - 60_000) attempts.shift();
  return attempts.length >= 5;
}
export function recordFailedAttempt() {
  attempts.push(Date.now());
}
