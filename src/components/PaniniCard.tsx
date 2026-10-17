"use client";
import { useState } from "react";
import Link from "next/link";
import { BallAvatar } from "./Avatar";
import { LogoMark } from "./Logo";
import { parseAvatar, type AvatarConfig } from "@/lib/avatar";

export type CardPlayer = {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string | null;
  points: number | null;
  team_name: string | null;
  play_style: string | null;
  hand: string | null;
  favorite_shot: string | null;
  motto: string | null;
  photo_portrait: string | null;
  photo_victory: string | null;
  avatar: string | null;
  wins: number;
  losses: number;
  rarity: "bronze" | "argent" | "or" | "legende";
  number?: number;
};

const RARITY_LABEL = { bronze: "Bronze", argent: "Argent", or: "Or", legende: "Légende" };

function Visual({ photo, avatar, alt, victory }: { photo: string | null; avatar: AvatarConfig | null; alt: string; victory?: boolean }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/media/${photo}`} alt={alt} className="h-full w-full object-cover" />;
  }
  const cfg = avatar ?? undefined;
  return (
    <BallAvatar
      config={victory && cfg ? { ...cfg, eyes: "happy", mouth: "grin", hat: "crown" } : cfg}
      className="h-full w-full"
    />
  );
}

export function PaniniCard({ p, link = true }: { p: CardPlayer; link?: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const avatar = parseAvatar(p.avatar);
  const total = p.wins + p.losses;
  const ratio = total ? Math.round((p.wins / total) * 100) : 0;
  const holo = p.rarity === "or" || p.rarity === "legende";

  return (
    <div className={`panini rarity-${p.rarity} ${flipped ? "flipped" : ""} select-none`} onClick={() => setFlipped(!flipped)}>
      <div className="panini-inner">
        {/* Recto : photo de présentation */}
        <div className={`panini-face panini-frame ${holo ? "holo" : ""}`}>
          <div className="relative flex h-full flex-col overflow-hidden rounded-[0.7rem] bg-club-blue stripes">
            <div className="flex items-center justify-between px-3 pt-2">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-xs text-white/80">#{String(p.number ?? p.id).padStart(3, "0")}</span>
            </div>
            <div className="relative mx-3 mt-1 flex-1 overflow-hidden rounded-lg border-2 border-white/20 bg-club-navy">
              <Visual photo={p.photo_portrait} avatar={avatar} alt={`${p.first_name} en présentation`} />
              <div className="absolute right-1 top-1 rounded-md bg-club-navy/80 px-2 py-1 text-center leading-none">
                <span className="font-display block text-xl text-club-yellow">{p.points ?? "-"}</span>
                <span className="text-[8px] font-bold uppercase text-white/70">pts</span>
              </div>
            </div>
            <div className="relative -mt-4 px-2">
              <div className="skew-tag w-full bg-club-yellow text-center text-club-navy shadow-lg">
                <span className="font-display truncate text-lg uppercase">{p.first_name} {p.last_name}</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase text-white/90">
              <span className="truncate">{p.team_name ?? "Loisir"}</span>
              <span className="rounded-full bg-white/15 px-2 py-0.5">{RARITY_LABEL[p.rarity]}</span>
            </div>
          </div>
        </div>

        {/* Verso : photo victoire et stats */}
        <div className={`panini-face panini-back panini-frame ${holo ? "holo" : ""}`}>
          <div className="relative flex h-full flex-col overflow-hidden rounded-[0.7rem] bg-club-red stripes">
            <div className="relative h-1/2 overflow-hidden">
              <Visual photo={p.photo_victory} avatar={avatar} alt={`${p.first_name} en mode victoire`} victory />
              <span className="font-display absolute bottom-1 left-2 rotate-[-6deg] text-2xl text-club-yellow drop-shadow-[0_2px_0_#000]">
                YESSS !
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3 text-xs">
              {p.nickname && <p className="font-display text-base uppercase text-club-yellow">« {p.nickname} »</p>}
              <div className="grid grid-cols-3 gap-1 text-center">
                <Stat label="Vict." value={p.wins} />
                <Stat label="Déf." value={p.losses} />
                <Stat label="%" value={ratio} />
              </div>
              {p.play_style && <p><b>Style :</b> {p.play_style}{p.hand ? ` · ${p.hand}` : ""}</p>}
              {p.favorite_shot && <p><b>Coup fatal :</b> {p.favorite_shot}</p>}
              {p.motto && <p className="mt-auto italic text-white/90">“{p.motto}”</p>}
              {link && (
                <Link href={`/joueurs/${p.id}`} onClick={(e) => e.stopPropagation()} className="mt-1 text-center font-bold uppercase text-club-yellow underline">
                  Voir la fiche
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-black/25 py-1">
      <span className="font-display block text-lg leading-none">{value}</span>
      <span className="text-[9px] uppercase text-white/70">{label}</span>
    </div>
  );
}
