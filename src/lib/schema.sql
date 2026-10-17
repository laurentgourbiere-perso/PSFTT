-- Schéma de la base locale PSFTT (SQLite). Idempotent : exécuté à chaque démarrage.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'visiteur', -- visiteur | adherent | capitaine | bureau | admin
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT,
  consent_at    TEXT NOT NULL              -- date d'acceptation de la politique de confidentialité
);

-- Profil joueur : séparé du compte pour faciliter export / effacement RGPD
CREATE TABLE IF NOT EXISTS profiles (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nickname        TEXT,
  bio             TEXT,
  motto           TEXT,           -- devise / cri de guerre
  hand            TEXT,           -- droitier | gaucher
  grip            TEXT,           -- europeenne | porte-plume
  play_style      TEXT,           -- attaquant | defenseur | contreur | polyvalent | lifteur
  favorite_shot   TEXT,
  blade           TEXT,
  rubbers         TEXT,
  idol            TEXT,
  licence_number  TEXT,           -- visible aux seuls adhérents
  points          INTEGER,        -- points classement FFTT
  phone           TEXT,           -- visible aux seuls adhérents, si autorisé
  photo_portrait  TEXT,           -- id de fichier (data/uploads)
  photo_victory   TEXT,
  avatar          TEXT,           -- JSON de configuration de l'avatar généré
  team_id         INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  -- Consentements RGPD (opt-in, modifiables à tout moment)
  public_profile  INTEGER NOT NULL DEFAULT 0, -- fiche visible des visiteurs non adhérents
  public_photos   INTEGER NOT NULL DEFAULT 0, -- photos visibles hors adhérents
  social_sharing  INTEGER NOT NULL DEFAULT 0, -- mise en avant sur les réseaux sociaux
  show_phone      INTEGER NOT NULL DEFAULT 0, -- téléphone visible des adhérents
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teams (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  division   TEXT,
  captain_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  color      TEXT
);

CREATE TABLE IF NOT EXISTS matches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  round       INTEGER,
  date        TEXT NOT NULL,
  opponent    TEXT NOT NULL,
  home        INTEGER NOT NULL DEFAULT 1,
  score_us    INTEGER,
  score_them  INTEGER,
  location    TEXT
);

CREATE TABLE IF NOT EXISTS meetings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'comite', -- comite | bureau | ag | capitaines
  attendees   TEXT,
  content     TEXT NOT NULL,
  decisions   TEXT,
  visibility  TEXT NOT NULL DEFAULT 'bureau', -- bureau | adherents
  author_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meeting_actions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id  INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  owner       TEXT,
  due_date    TEXT,
  done        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budget_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL,
  amount      REAL NOT NULL,           -- positif = recette, négatif = dépense
  season      TEXT NOT NULL,
  author_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS news (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  emoji       TEXT,
  date        TEXT NOT NULL DEFAULT (date('now'))
);

-- Journal d'accès aux données personnelles (traçabilité RGPD des actions d'administration)
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id   INTEGER,
  action     TEXT NOT NULL,
  target     TEXT,
  at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Statistiques individuelles (à terme alimentées par l'API FFTT)
CREATE TABLE IF NOT EXISTS player_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  wins    INTEGER NOT NULL DEFAULT 0,
  losses  INTEGER NOT NULL DEFAULT 0,
  perfs   INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Tournois (ex. Tournoi du Torrenchin)
-- ============================================================

CREATE TABLE IF NOT EXISTS tournaments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  date           TEXT NOT NULL,                 -- AAAA-MM-JJ
  venue          TEXT,
  start_time     TEXT,                          -- HH:MM
  checkin_time   TEXT,                          -- ouverture du pointage sur place
  description    TEXT,
  sponsors       TEXT,                          -- un partenaire par ligne
  status         TEXT NOT NULL DEFAULT 'inscriptions', -- brouillon | inscriptions | en_cours | termine
  max_events     INTEGER NOT NULL DEFAULT 2,    -- nombre maxi de tableaux simples par joueur
  price_1        REAL NOT NULL DEFAULT 7,       -- 1 tableau
  price_2        REAL NOT NULL DEFAULT 12,      -- 2 tableaux
  price_double   REAL NOT NULL DEFAULT 5,       -- double, par joueur
  tables_count   INTEGER NOT NULL DEFAULT 10,   -- tables installées dans la salle
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Un « tableau » : Jeunes -16 ans, Handicap, Toutes séries, Double…
CREATE TABLE IF NOT EXISTS tournament_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id   INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  is_double       INTEGER NOT NULL DEFAULT 0,
  handicap        INTEGER NOT NULL DEFAULT 0,   -- points d'avance selon l'écart de classement
  min_points      INTEGER,
  max_points      INTEGER,
  min_birth_year  INTEGER,                      -- ex. 2011 pour les moins de 16 ans
  capacity        INTEGER,
  format          TEXT NOT NULL DEFAULT 'poules', -- poules (puis tableau final) | ko (élimination directe)
  group_size      INTEGER NOT NULL DEFAULT 3,
  qualifiers      INTEGER NOT NULL DEFAULT 2,   -- sortants par poule
  best_of         INTEGER NOT NULL DEFAULT 5,   -- 3 ou 5 manches
  start_time      TEXT,
  status          TEXT NOT NULL DEFAULT 'inscriptions' -- inscriptions | poules | tableau | termine
);

-- Joueur inscrit au tournoi (licencié ou non, avec ou sans compte sur le site)
CREATE TABLE IF NOT EXISTS tournament_players (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id   INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT,                          -- jamais affiché publiquement
  phone           TEXT,                          -- jamais affiché publiquement
  club            TEXT,
  licence         TEXT,
  points          INTEGER NOT NULL DEFAULT 500,
  birth_year      INTEGER,
  ref             TEXT NOT NULL UNIQUE,         -- code de réservation (accès au récapitulatif)
  amount_due      REAL NOT NULL DEFAULT 0,
  amount_paid     REAL NOT NULL DEFAULT 0,
  payment_method  TEXT,                          -- en_ligne | especes | cheque | cb | offert
  paid_at         TEXT,
  checked_in      INTEGER NOT NULL DEFAULT 0,   -- pointé à la table de marque
  registered_by   INTEGER REFERENCES tournament_players(id) ON DELETE SET NULL, -- inscrit par son partenaire de double
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tournament_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    INTEGER NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  player_id   INTEGER NOT NULL REFERENCES tournament_players(id) ON DELETE CASCADE,
  partner_id  INTEGER REFERENCES tournament_players(id) ON DELETE CASCADE, -- double
  status      TEXT NOT NULL DEFAULT 'inscrit',  -- inscrit | attente | forfait
  seed        INTEGER,
  group_no    INTEGER,
  final_rank  INTEGER,                          -- 1, 2, 3 (demi-finalistes)…
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id     INTEGER NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  stage        TEXT NOT NULL,                   -- poule | ko
  group_no     INTEGER,
  round        INTEGER,                         -- ko : nb de joueurs du tour (16, 8, 4, 2)
  slot         INTEGER NOT NULL DEFAULT 0,      -- ordre dans la poule / position dans le tour
  entry_a      INTEGER REFERENCES tournament_entries(id) ON DELETE SET NULL,
  entry_b      INTEGER REFERENCES tournament_entries(id) ON DELETE SET NULL,
  handicap_a   INTEGER NOT NULL DEFAULT 0,      -- points d'avance au début de chaque manche
  handicap_b   INTEGER NOT NULL DEFAULT 0,
  sets         TEXT NOT NULL DEFAULT '[]',      -- JSON [[11,7],[9,11]…], manche en cours incluse
  winner       INTEGER REFERENCES tournament_entries(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'attente', -- attente | pret | appele | en_cours | termine
  outcome      TEXT,                            -- normal | forfait | exempt
  table_no     INTEGER,
  next_match   INTEGER REFERENCES tournament_matches(id) ON DELETE SET NULL,
  next_side    TEXT,                            -- a | b
  ready_at     TEXT,
  called_at    TEXT,
  started_at   TEXT,
  finished_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_tmatch_event ON tournament_matches(event_id, stage);

-- Lots : par tableau et par place, ou tombola (event_id et place vides)
CREATE TABLE IF NOT EXISTS tournament_prizes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id  INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  event_id       INTEGER REFERENCES tournament_events(id) ON DELETE CASCADE,
  rank           INTEGER,                        -- 1 vainqueur, 2 finaliste, 3 demi-finaliste
  label          TEXT NOT NULL,
  value          REAL,                           -- valeur estimée en €
  sponsor        TEXT,
  winner_entry   INTEGER REFERENCES tournament_entries(id) ON DELETE SET NULL, -- lot sportif
  winner_player  INTEGER REFERENCES tournament_players(id) ON DELETE SET NULL, -- tombola
  handed_at      TEXT                            -- lot remis
);

-- Historique point par point des matchs suivis en direct (permet d'annuler exactement le dernier point)
CREATE TABLE IF NOT EXISTS tournament_points (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id  INTEGER NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  side      TEXT NOT NULL                     -- a | b
);
