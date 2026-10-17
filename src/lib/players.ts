import "server-only";
import { db } from "./db";
import { can } from "./roles";
import type { SessionUser } from "./auth";

export type PlayerRow = {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  nickname: string | null;
  bio: string | null;
  motto: string | null;
  hand: string | null;
  grip: string | null;
  play_style: string | null;
  favorite_shot: string | null;
  blade: string | null;
  rubbers: string | null;
  idol: string | null;
  licence_number: string | null;
  points: number | null;
  phone: string | null;
  photo_portrait: string | null;
  photo_victory: string | null;
  avatar: string | null;
  team_id: number | null;
  team_name: string | null;
  public_profile: number;
  public_photos: number;
  social_sharing: number;
  show_phone: number;
  wins: number;
  losses: number;
};

const BASE = `
  SELECT u.id, u.first_name, u.last_name, u.role, p.*, t.name AS team_name,
         COALESCE(s.wins, 0) AS wins, COALESCE(s.losses, 0) AS losses
  FROM users u
  JOIN profiles p ON p.user_id = u.id
  LEFT JOIN teams t ON t.id = p.team_id
  LEFT JOIN player_stats s ON s.user_id = u.id
  WHERE u.role != 'visiteur'`;

/**
 * Applique les règles de visibilité RGPD :
 * - un visiteur ne voit que les fiches dont le joueur a accepté la publication, avec le nom abrégé ;
 * - les photos ne sortent du cercle des adhérents qu'avec consentement ;
 * - licence et téléphone ne sont jamais publics.
 */
export function redact(p: PlayerRow, viewer: SessionUser | null): PlayerRow {
  const self = viewer?.id === p.id;
  const member = can.seeMembers(viewer?.role) || self;
  if (member) {
    return { ...p, phone: p.show_phone || self || can.manageUsers(viewer?.role) ? p.phone : null };
  }
  return {
    ...p,
    last_name: p.last_name.charAt(0) + ".",
    licence_number: null,
    phone: null,
    photo_portrait: p.public_photos ? p.photo_portrait : null,
    photo_victory: p.public_photos ? p.photo_victory : null,
  };
}

export function listPlayers(viewer: SessionUser | null) {
  const member = can.seeMembers(viewer?.role);
  const rows = db
    .prepare(`${BASE} ${member ? "" : "AND p.public_profile = 1"} ORDER BY COALESCE(p.points, 0) DESC`)
    .all() as PlayerRow[];
  return rows.map((r) => redact(r, viewer));
}

export function getPlayer(id: number, viewer: SessionUser | null) {
  const row = db.prepare(`${BASE} AND u.id = ?`).get(id) as PlayerRow | undefined;
  if (!row) return null;
  const member = can.seeMembers(viewer?.role) || viewer?.id === id;
  if (!member && !row.public_profile) return null;
  return redact(row, viewer);
}

export type Rarity = "bronze" | "argent" | "or" | "legende";
export function rarity(points: number | null): Rarity {
  const p = points ?? 500;
  if (p >= 1600) return "legende";
  if (p >= 1100) return "or";
  if (p >= 800) return "argent";
  return "bronze";
}

export function badges(p: PlayerRow) {
  const b: { icon: string; label: string }[] = [];
  if (p.wins >= 10) b.push({ icon: "🔥", label: "10 victoires" });
  if (p.wins + p.losses > 0 && p.wins / (p.wins + p.losses) >= 0.7) b.push({ icon: "🎯", label: "Sniper (70 % de victoires)" });
  if (p.hand === "gaucher") b.push({ icon: "🫲", label: "Gaucher redouté" });
  if (p.grip === "porte-plume") b.push({ icon: "🖊️", label: "Porte-plume" });
  if (p.role === "capitaine") b.push({ icon: "©️", label: "Capitaine" });
  if ((p.points ?? 0) >= 1500) b.push({ icon: "👑", label: "Top niveau club" });
  return b;
}

export function toCard(p: PlayerRow, number?: number) {
  return {
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    nickname: p.nickname,
    points: p.points,
    team_name: p.team_name,
    play_style: p.play_style,
    hand: p.hand,
    favorite_shot: p.favorite_shot,
    motto: p.motto,
    photo_portrait: p.photo_portrait,
    photo_victory: p.photo_victory,
    avatar: p.avatar,
    wins: p.wins,
    losses: p.losses,
    rarity: rarity(p.points),
    number,
  };
}
