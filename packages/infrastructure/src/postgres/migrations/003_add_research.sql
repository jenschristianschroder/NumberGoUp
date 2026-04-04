-- Research state: stores research points and unlocked research node IDs per player.
-- Research is permanent (survives prestige resets).
CREATE TABLE IF NOT EXISTS player_research_state (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  research_points TEXT NOT NULL DEFAULT '0',
  unlocked_node_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);
