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

export type Sport = {
  label: string;
  emoji: string;
  court: string;        // Table, Terrain, Court…
  usesPoints: boolean;  // classement chiffré (points FFTT, classement badminton…)
  pointsLabel: string;
  presets: EventPreset[];
};

export const SPORTS: Record<string, Sport> = {
  tennis_de_table: {
    label: "Tennis de table", emoji: "🏓", court: "Table", usesPoints: true, pointsLabel: "Points",
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
    presets: [
      { name: "Simple messieurs", capacity: 32, format: "ko", best_of: 3, checked: true },
      { name: "Simple dames", capacity: 32, format: "ko", best_of: 3, checked: true },
      { name: "Double", is_double: true, capacity: 16, format: "ko", best_of: 3 },
    ],
  },
  petanque: {
    label: "Pétanque", emoji: "🎯", court: "Terrain", usesPoints: false, pointsLabel: "Niveau",
    presets: [
      { name: "Doublettes", is_double: true, capacity: 32, best_of: 1, checked: true },
      { name: "Tête-à-tête", capacity: 32, best_of: 1 },
    ],
  },
  autre: {
    label: "Autre sport", emoji: "🏆", court: "Terrain", usesPoints: false, pointsLabel: "Niveau",
    presets: [{ name: "Tableau principal", capacity: 32, checked: true }],
  },
};

export const sportOf = (key: string) => SPORTS[key] ?? SPORTS.autre;
