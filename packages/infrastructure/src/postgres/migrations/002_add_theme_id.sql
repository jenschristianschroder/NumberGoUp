-- Migration 002: Add theme_id to players table
-- Tracks which game theme was used to create the account.

ALTER TABLE players ADD COLUMN theme_id TEXT NOT NULL DEFAULT 'generic';
