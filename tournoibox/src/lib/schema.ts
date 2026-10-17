// Schéma TournoiBox (SQLite), embarqué dans le code pour l'application installée. Idempotent : exécuté à chaque démarrage.
export const SCHEMA = `
-- Réglages de l'installation (mot de passe organisateur…)
CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  date          TEXT NOT NULL,                  -- AAAA-MM-JJ
  venue         TEXT,
  start_time    TEXT,                           -- HH:MM
  sport         TEXT NOT NULL DEFAULT 'tennis_de_table',
  court_label   TEXT NOT NULL DEFAULT 'Table',  -- Table, Terrain, Court, Piste…
  courts_count  INTEGER NOT NULL DEFAULT 8,
  max_players   INTEGER,                        -- limite globale (taille de la salle), vide = aucune
  max_events    INTEGER NOT NULL DEFAULT 2,     -- tableaux simples par joueur
  price_1       REAL NOT NULL DEFAULT 0,        -- 1 tableau
  price_2       REAL NOT NULL DEFAULT 0,        -- 2 tableaux
  price_double  REAL NOT NULL DEFAULT 0,        -- double, par joueur
  status        TEXT NOT NULL DEFAULT 'inscriptions', -- inscriptions | en_cours | termine
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Un tableau (catégorie) : Toutes séries, Jeunes, Double…
CREATE TABLE IF NOT EXISTS events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id   INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  is_double       INTEGER NOT NULL DEFAULT 0,
  handicap        INTEGER NOT NULL DEFAULT 0,
  min_points      INTEGER,
  max_points      INTEGER,
  min_birth_year  INTEGER,
  max_birth_year  INTEGER,
  capacity        INTEGER,                      -- places (joueurs, ou paires en double)
  format          TEXT NOT NULL DEFAULT 'poules', -- poules | ko
  group_size      INTEGER NOT NULL DEFAULT 3,
  qualifiers      INTEGER NOT NULL DEFAULT 2,
  best_of         INTEGER NOT NULL DEFAULT 5,
  start_time      TEXT,
  status          TEXT NOT NULL DEFAULT 'inscriptions' -- inscriptions | poules | tableau | termine
);

CREATE TABLE IF NOT EXISTS players (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id   INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  club            TEXT,
  licence         TEXT,
  points          INTEGER NOT NULL DEFAULT 500,
  birth_year      INTEGER,
  phone           TEXT,
  amount_due      REAL NOT NULL DEFAULT 0,
  amount_paid     REAL NOT NULL DEFAULT 0,
  payment_method  TEXT,                          -- especes | cheque | cb | offert
  checked_in      INTEGER NOT NULL DEFAULT 1,   -- présent dans la salle
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  partner_id  INTEGER REFERENCES players(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'inscrit',  -- inscrit | attente | forfait
  seed        INTEGER,
  group_no    INTEGER,
  final_rank  INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_entries_event ON entries(event_id, status);

CREATE TABLE IF NOT EXISTS matches (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage        TEXT NOT NULL,                   -- poule | ko
  group_no     INTEGER,
  round        INTEGER,                         -- ko : nombre de joueurs du tour (16, 8, 4, 2)
  slot         INTEGER NOT NULL DEFAULT 0,      -- ordre dans la poule / position dans le tour
  entry_a      INTEGER REFERENCES entries(id) ON DELETE SET NULL,
  entry_b      INTEGER REFERENCES entries(id) ON DELETE SET NULL,
  handicap_a   INTEGER NOT NULL DEFAULT 0,
  handicap_b   INTEGER NOT NULL DEFAULT 0,
  sets         TEXT NOT NULL DEFAULT '[]',      -- JSON [[11,7],[9,11]…]
  winner       INTEGER REFERENCES entries(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'attente', -- attente | pret | appele | en_cours | termine
  outcome      TEXT,                            -- normal | forfait | exempt
  court_no     INTEGER,
  next_match   INTEGER REFERENCES matches(id) ON DELETE SET NULL,
  next_side    TEXT,                            -- a | b
  ready_at     TEXT,
  called_at    TEXT,
  started_at   TEXT,
  finished_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(event_id, stage);

-- Lots : par tableau et par place (lot sportif), ou tombola (tableau et place vides)
CREATE TABLE IF NOT EXISTS prizes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id  INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  event_id       INTEGER REFERENCES events(id) ON DELETE CASCADE,
  rank           INTEGER,                       -- 1 vainqueur, 2 finaliste, 3 demi-finaliste…
  label          TEXT NOT NULL,
  value          REAL,                          -- valeur en €
  sponsor        TEXT,                          -- offert par
  winner_entry   INTEGER REFERENCES entries(id) ON DELETE SET NULL,  -- lot sportif
  winner_player  INTEGER REFERENCES players(id) ON DELETE SET NULL,  -- tombola
  drawn_at       TEXT,                          -- date du tirage de tombola
  handed_at      TEXT                           -- lot remis
);
CREATE INDEX IF NOT EXISTS idx_prizes_tournament ON prizes(tournament_id);
`;
