PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT NOT NULL DEFAULT 'free',
  latest_backup_id TEXT,
  latest_generation TEXT
);

CREATE TABLE IF NOT EXISTS backup_metadata (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  schema_version TEXT NOT NULL,
  generation TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  created_at INTEGER NOT NULL,
  client_created_at INTEGER,
  status TEXT NOT NULL DEFAULT 'ready',
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_backup_family_created
  ON backup_metadata(family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_family_generation
  ON backup_metadata(family_id, generation);
