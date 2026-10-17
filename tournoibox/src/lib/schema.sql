-- Schéma TournoiBox (SQLite). Idempotent : exécuté à chaque démarrage.

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
