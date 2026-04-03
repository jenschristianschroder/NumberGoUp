-- Migration 001: Core player state schema
-- All timestamps are UTC (timestamptz).
-- Currency stored as TEXT to preserve exact integer values without precision loss.

CREATE TABLE IF NOT EXISTS players (
    id          TEXT PRIMARY KEY,
    version     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_run_state (
    player_id       TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    currency        TEXT NOT NULL DEFAULT '0',
    last_tick_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generators      JSONB NOT NULL DEFAULT '[]',
    upgrades        JSONB NOT NULL DEFAULT '[]',
    automations     JSONB NOT NULL DEFAULT '[]',
    active_boosts   JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS player_meta_progression (
    player_id                       TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    prestige_count                  INTEGER NOT NULL DEFAULT 0,
    permanent_multiplier_scaled     TEXT NOT NULL DEFAULT '0',
    total_lifetime_earnings         TEXT NOT NULL DEFAULT '0'
);

-- Idempotency keys for write operations (last 100 per player).
CREATE TABLE IF NOT EXISTS player_idempotency_keys (
    player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    key         TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_player_created
    ON player_idempotency_keys (player_id, created_at DESC);

-- Reward claim ledger (append-only; used to prevent double-claiming).
CREATE TABLE IF NOT EXISTS player_reward_claims (
    player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    event_id    TEXT NOT NULL,
    reward_id   TEXT NOT NULL,
    claimed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, event_id, reward_id)
);
