// Modes de l'écran de la salle (fichier sans dépendance serveur).

export const SCREEN_MODES = {
  auto: { label: "Automatique", emoji: "✨", help: "Enchaîne ce qui est utile selon l'avancement : places, appels, poules, tableaux, résultats, podiums" },
  inscriptions: { label: "Places restantes", emoji: "🎟️", help: "Remplissage de chaque tableau pendant les inscriptions" },
  appels: { label: "Appels", emoji: "📣", help: "Les matchs appelés, en très grand" },
  tables: { label: "Tables", emoji: "🏓", help: "Ce qui se joue sur chaque table" },
  poules: { label: "Poules", emoji: "🔢", help: "Classements des poules, qui défilent" },
  tableaux: { label: "Tableaux", emoji: "🌳", help: "Tableaux finaux à élimination directe" },
  resultats: { label: "Résultats", emoji: "✅", help: "Les derniers résultats" },
  podiums: { label: "Podiums", emoji: "🏆", help: "Les vainqueurs de chaque tableau" },
  annonce: { label: "Annonce", emoji: "📢", help: "Votre message en plein écran" },
} as const;

export type ScreenMode = keyof typeof SCREEN_MODES;
