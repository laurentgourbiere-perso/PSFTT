// Avatar « balle de ping-pong » générée, alternative ludique à la photo (aucune donnée biométrique)
export type AvatarConfig = {
  ball: string;      // couleur de la balle
  bg: string;        // fond
  eyes: "normal" | "happy" | "fire" | "cool" | "wink";
  mouth: "smile" | "grin" | "o" | "tongue" | "serious";
  hat: "none" | "headband" | "cap" | "crown" | "sweat";
};

export const AVATAR_OPTIONS = {
  ball: ["#ffffff", "#ff8a00", "#ffd400", "#ff5ea8", "#7cf29c"],
  bg: ["#0b3c8c", "#e30613", "#ffd400", "#141414", "#00a6a6", "#7b2ff7"],
  eyes: ["normal", "happy", "fire", "cool", "wink"],
  mouth: ["smile", "grin", "o", "tongue", "serious"],
  hat: ["none", "headband", "cap", "crown", "sweat"],
} as const;

export const DEFAULT_AVATAR: AvatarConfig = { ball: "#ffffff", bg: "#0b3c8c", eyes: "normal", mouth: "smile", hat: "headband" };

export function parseAvatar(raw: string | null | undefined): AvatarConfig | null {
  if (!raw) return null;
  try {
    const a = JSON.parse(raw);
    return { ...DEFAULT_AVATAR, ...a };
  } catch {
    return null;
  }
}

export function randomAvatar(): AvatarConfig {
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
  return {
    ball: pick(AVATAR_OPTIONS.ball),
    bg: pick(AVATAR_OPTIONS.bg),
    eyes: pick(AVATAR_OPTIONS.eyes),
    mouth: pick(AVATAR_OPTIONS.mouth),
    hat: pick(AVATAR_OPTIONS.hat),
  };
}
