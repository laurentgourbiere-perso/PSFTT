// Sports proposés à la création d'un tournoi : vocabulaire et tableaux suggérés.
// Fichier sans dépendance serveur : utilisable côté navigateur.

export type EventPreset = {
  name: string;
  is_double?: boolean;
  handicap?: boolean;
  max_points?: number;
  under_age?: number;   // « moins de N ans » → année de naissance minimale calculée à la création
  capacity?: number;
  format?: "poules" | "ko";
  best_of?: number;
  checked?: boolean;    // coché par défaut
};

/** Règle d'une manche : nombre de points à atteindre, deux points d'écart, plafond éventuel. */
export type SetRule = { target: number | null; winBy2: boolean; cap?: number; unit: string };

export type Sport = {
  label: string;
  emoji: string;
  court: string;        // Table, Terrain, Court…
  usesPoints: boolean;  // classement chiffré (points FFTT, classement badminton…)
  pointsLabel: string;
  set: SetRule;         // target null : score libre, le plus haut gagne la manche
  setLabel: string;     // manche, set, partie
  example: string;      // exemple de score à saisir
  presets: EventPreset[];
};

/** Une manche saisie est-elle un score possible ? Renvoie la raison sinon. */
export function invalidSet(a: number, b: number, r: SetRule): string | null {
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if (a === b) return "égalité impossible";
  if (r.target == null) return null;
  if (r.cap != null && hi === r.cap && lo === r.cap - 1) return null;
  if (!r.winBy2) return hi === r.target ? null : `le gagnant doit avoir ${r.target}`;
  if (hi < r.target) return `il faut ${r.target} points pour gagner`;
  if (hi === r.target && lo <= r.target - 2) return null;
  if (hi > r.target && hi - lo === 2) return null;
  return `2 points d'écart nécessaires`;
}

/** Une manche en cours (score en direct) est-elle terminée ? */
export function setDone(a: number, b: number, r: SetRule) {
  if (r.target == null) return false;
  return invalidSet(a, b, r) === null;
}

export const SPORTS: Record<string, Sport> = {
  tennis_de_table: {
    label: "Tennis de table", emoji: "🏓", court: "Table", usesPoints: true, pointsLabel: "Points",
    set: { target: 11, winBy2: true, unit: "points" }, setLabel: "manche", example: "11-7 9-11 11-5",
    presets: [
      { name: "Toutes séries", capacity: 48, checked: true },
      { name: "Jeunes -16 ans", under_age: 16, capacity: 24, checked: true },
      { name: "Non classés & non licenciés (<700)", max_points: 699, capacity: 32, checked: true },
      { name: "Handicap", handicap: true, capacity: 48, best_of: 3, checked: true },
      { name: "Double", is_double: true, capacity: 24, format: "ko", checked: true },
      { name: "Vétérans +50 ans", capacity: 24 },
      { name: "Féminines", capacity: 24 },
    ],
  },
  badminton: {
    label: "Badminton", emoji: "🏸", court: "Terrain", usesPoints: true, pointsLabel: "Côte",
    set: { target: 21, winBy2: true, cap: 30, unit: "points" }, setLabel: "set", example: "21-15 19-21 21-12",
    presets: [
      { name: "Simple hommes", capacity: 32, best_of: 3, checked: true },
      { name: "Simple dames", capacity: 32, best_of: 3, checked: true },
      { name: "Double hommes", is_double: true, capacity: 16, best_of: 3, checked: true },
      { name: "Double dames", is_double: true, capacity: 16, best_of: 3, checked: true },
      { name: "Double mixte", is_double: true, capacity: 16, best_of: 3, checked: true },
    ],
  },
  tennis: {
    label: "Tennis", emoji: "🎾", court: "Court", usesPoints: false, pointsLabel: "Classement",
    set: { target: null, winBy2: false, unit: "jeux" }, setLabel: "set", example: "6-4 3-6 6-2",
    presets: [
      { name: "Simple messieurs", capacity: 32, format: "ko", best_of: 3, checked: true },
      { name: "Simple dames", capacity: 32, format: "ko", best_of: 3, checked: true },
      { name: "Double", is_double: true, capacity: 16, format: "ko", best_of: 3 },
    ],
  },
  petanque: {
    label: "Pétanque", emoji: "🎯", court: "Terrain", usesPoints: false, pointsLabel: "Niveau",
    set: { target: 13, winBy2: false, unit: "points" }, setLabel: "partie", example: "13-8",
    presets: [
      { name: "Doublettes", is_double: true, capacity: 32, best_of: 1, checked: true },
      { name: "Tête-à-tête", capacity: 32, best_of: 1 },
    ],
  },
  autre: {
    label: "Autre sport", emoji: "🏆", court: "Terrain", usesPoints: false, pointsLabel: "Niveau",
    set: { target: null, winBy2: false, unit: "points" }, setLabel: "manche", example: "3-1",
    presets: [{ name: "Tableau principal", capacity: 32, checked: true }],
  },
};

export const sportOf = (key: string) => SPORTS[key] ?? SPORTS.autre;
