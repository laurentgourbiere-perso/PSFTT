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
