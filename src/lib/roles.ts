export const ROLES = ["visiteur", "adherent", "capitaine", "bureau", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  visiteur: "Supporter",
  adherent: "Adhérent",
  capitaine: "Capitaine",
  bureau: "Comité",
  admin: "Administrateur",
};

export const ROLE_COLORS: Record<Role, string> = {
  visiteur: "bg-slate-200 text-slate-800",
  adherent: "bg-sky-200 text-sky-900",
  capitaine: "bg-amber-300 text-amber-950",
  bureau: "bg-violet-300 text-violet-950",
  admin: "bg-rose-500 text-white",
};

// Chaque rôle hérite des droits des rôles précédents
export function hasRole(role: string | undefined | null, min: Role) {
  if (!role) return false;
  return ROLES.indexOf(role as Role) >= ROLES.indexOf(min);
}

export const can = {
  seeMembers: (r?: string | null) => hasRole(r, "adherent"),
  manageTeams: (r?: string | null) => hasRole(r, "capitaine"),
  seeMeetings: (r?: string | null) => hasRole(r, "adherent"),
  editMeetings: (r?: string | null) => hasRole(r, "bureau"),
  seeBudget: (r?: string | null) => hasRole(r, "bureau"),
  manageUsers: (r?: string | null) => hasRole(r, "admin"),
};
