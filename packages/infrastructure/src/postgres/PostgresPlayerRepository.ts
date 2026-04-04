import type { Pool } from 'pg';
import type { PlayerAccount, RunState, MetaProgression } from '@numbergoUp/domain';
import {
  asPlayerId,
  asGeneratorId,
  asUpgradeId,
  asAutomationId,
  asEventId,
  asRewardId,
  asResearchNodeId,
  parseCurrency,
  ConcurrencyError,
} from '@numbergoUp/domain';
import type { PlayerRepository } from '@numbergoUp/application';

/**
 * PostgreSQL implementation of PlayerRepository.
 *
 * Optimistic concurrency: the UPDATE statement includes `WHERE version = $expected`
 * and throws ConcurrencyError if no row was updated.
 *
 * Currency is stored as TEXT (decimal string) to avoid numeric precision issues.
 * All timestamps are stored and read as UTC.
 */
export class PostgresPlayerRepository implements PlayerRepository {
  constructor(private readonly pool: Pool) {}

  async findById(playerId: string): Promise<PlayerAccount | null> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        `SELECT p.*, 
                r.currency, r.last_tick_at,
                r.generators, r.upgrades, r.automations, r.active_boosts,
                m.prestige_count, m.permanent_multiplier_scaled, m.total_lifetime_earnings,
                COALESCE(rs.research_points, '0') AS research_points,
                COALESCE(rs.unlocked_node_ids, '[]'::jsonb) AS unlocked_node_ids,
                array_agg(DISTINCT ik.key) FILTER (WHERE ik.key IS NOT NULL) AS idempotency_keys,
                json_agg(DISTINCT jsonb_build_object(
                  'eventId', rc.event_id,
                  'rewardId', rc.reward_id,
                  'claimedAt', rc.claimed_at
                )) FILTER (WHERE rc.event_id IS NOT NULL) AS claimed_rewards
         FROM players p
         JOIN player_run_state r ON r.player_id = p.id
         JOIN player_meta_progression m ON m.player_id = p.id
         LEFT JOIN player_research_state rs ON rs.player_id = p.id
         LEFT JOIN player_idempotency_keys ik ON ik.player_id = p.id
         LEFT JOIN player_reward_claims rc ON rc.player_id = p.id
         WHERE p.id = $1
         GROUP BY p.id, r.currency, r.last_tick_at, r.generators, r.upgrades,
                  r.automations, r.active_boosts,
                  m.prestige_count, m.permanent_multiplier_scaled, m.total_lifetime_earnings,
                  rs.research_points, rs.unlocked_node_ids`,
        [playerId],
      );

      if (res.rows.length === 0) return null;
      return rowToPlayerAccount(res.rows[0]);
    } finally {
      client.release();
    }
  }

  async create(account: PlayerAccount): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO players (id, theme_id, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [account.playerId, account.themeId, account.version, account.createdAt, account.updatedAt],
      );

      await client.query(
        `INSERT INTO player_run_state (player_id, currency, last_tick_at, generators, upgrades, automations, active_boosts)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          account.playerId,
          account.run.currency.toString(),
          account.run.lastTickAt,
          JSON.stringify(serializeGenerators(account.run)),
          JSON.stringify(serializeUpgrades(account.run)),
          JSON.stringify(serializeAutomations(account.run)),
          JSON.stringify(serializeBoosts(account.run)),
        ],
      );

      await client.query(
        `INSERT INTO player_meta_progression (player_id, prestige_count, permanent_multiplier_scaled, total_lifetime_earnings)
         VALUES ($1, $2, $3, $4)`,
        [
          account.playerId,
          account.meta.prestigeCount,
          account.meta.permanentMultiplierScaled.toString(),
          account.meta.totalLifetimeEarnings.toString(),
        ],
      );

      // Insert research state
      await client.query(
        `INSERT INTO player_research_state (player_id, research_points, unlocked_node_ids)
         VALUES ($1, $2, $3)`,
        [
          account.playerId,
          account.meta.research.researchPoints.toString(),
          JSON.stringify(account.meta.research.unlockedNodeIds),
        ],
      );

      // Insert idempotency key
      if (account.processedIdempotencyKeys.length > 0) {
        const lastKey =
          account.processedIdempotencyKeys[account.processedIdempotencyKeys.length - 1];
        await client.query(
          `INSERT INTO player_idempotency_keys (player_id, key, created_at)
           VALUES ($1, $2, $3)`,
          [account.playerId, lastKey, account.createdAt],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async save(account: PlayerAccount): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update version with optimistic concurrency check
      const playerRes = await client.query(
        `UPDATE players SET version = $1, updated_at = $2
         WHERE id = $3 AND version = $4
         RETURNING id`,
        [account.version, account.updatedAt, account.playerId, account.version - 1],
      );

      if (playerRes.rowCount === 0) {
        await client.query('ROLLBACK');
        throw new ConcurrencyError();
      }

      await client.query(
        `UPDATE player_run_state
         SET currency = $1, last_tick_at = $2, generators = $3, upgrades = $4,
             automations = $5, active_boosts = $6
         WHERE player_id = $7`,
        [
          account.run.currency.toString(),
          account.run.lastTickAt,
          JSON.stringify(serializeGenerators(account.run)),
          JSON.stringify(serializeUpgrades(account.run)),
          JSON.stringify(serializeAutomations(account.run)),
          JSON.stringify(serializeBoosts(account.run)),
          account.playerId,
        ],
      );

      await client.query(
        `UPDATE player_meta_progression
         SET prestige_count = $1, permanent_multiplier_scaled = $2,
             total_lifetime_earnings = $3
         WHERE player_id = $4`,
        [
          account.meta.prestigeCount,
          account.meta.permanentMultiplierScaled.toString(),
          account.meta.totalLifetimeEarnings.toString(),
          account.playerId,
        ],
      );

      // Upsert research state
      await client.query(
        `INSERT INTO player_research_state (player_id, research_points, unlocked_node_ids)
         VALUES ($1, $2, $3)
         ON CONFLICT (player_id) DO UPDATE
         SET research_points = EXCLUDED.research_points,
             unlocked_node_ids = EXCLUDED.unlocked_node_ids`,
        [
          account.playerId,
          account.meta.research.researchPoints.toString(),
          JSON.stringify(account.meta.research.unlockedNodeIds),
        ],
      );

      // Upsert idempotency keys (keep last 100)
      if (account.processedIdempotencyKeys.length > 0) {
        const lastKey =
          account.processedIdempotencyKeys[account.processedIdempotencyKeys.length - 1];
        await client.query(
          `INSERT INTO player_idempotency_keys (player_id, key, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (player_id, key) DO NOTHING`,
          [account.playerId, lastKey],
        );
        // Prune old keys beyond 100
        await client.query(
          `DELETE FROM player_idempotency_keys
           WHERE player_id = $1
             AND key NOT IN (
               SELECT key FROM player_idempotency_keys
               WHERE player_id = $1
               ORDER BY created_at DESC
               LIMIT 100
             )`,
          [account.playerId],
        );
      }

      // Upsert reward claims
      for (const claim of account.claimedRewards) {
        await client.query(
          `INSERT INTO player_reward_claims (player_id, event_id, reward_id, claimed_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (player_id, event_id, reward_id) DO NOTHING`,
          [account.playerId, claim.eventId, claim.rewardId, claim.claimedAt],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async hasProcessedKey(playerId: string, idempotencyKey: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM player_idempotency_keys WHERE player_id = $1 AND key = $2`,
      [playerId, idempotencyKey],
    );
    return (res.rowCount ?? 0) > 0;
  }
}

// ─── Serialisation helpers ───────────────────────────────────────────────────

function rowToPlayerAccount(row: Record<string, unknown>): PlayerAccount {
  const generators = (row.generators as Array<Record<string, unknown>>).map((g) => ({
    id: asGeneratorId(g.id as string),
    name: g.name as string,
    level: g.level as number,
    baseOutput: parseCurrency(g.baseOutput as string),
    multiplierScaled: BigInt(g.multiplierScaled as string),
  }));

  const upgrades = (row.upgrades as Array<Record<string, unknown>>).map((u) => ({
    id: asUpgradeId(u.id as string),
    name: u.name as string,
    description: u.description as string,
    cost: parseCurrency(u.cost as string),
    purchased: u.purchased as boolean,
    targetGeneratorId: u.targetGeneratorId
      ? asGeneratorId(u.targetGeneratorId as string)
      : undefined,
    multiplierBonusScaled: BigInt(u.multiplierBonusScaled as string),
  }));

  const automations = (row.automations as Array<Record<string, unknown>>).map((a) => ({
    id: asAutomationId(a.id as string),
    generatorId: asGeneratorId(a.generatorId as string),
    active: a.active as boolean,
  }));

  const activeBoosts = (row.active_boosts as Array<Record<string, unknown>>).map((b) => ({
    id: b.id as string,
    multiplierScaled: BigInt(b.multiplierScaled as string),
    expiresAt: new Date(b.expiresAt as string),
  }));

  const claimedRewards = Array.isArray(row.claimed_rewards)
    ? (row.claimed_rewards as Array<Record<string, unknown>>).map((c) => ({
        eventId: asEventId(c.eventId as string),
        rewardId: asRewardId(c.rewardId as string),
        claimedAt: new Date(c.claimedAt as string),
      }))
    : [];

  const run: RunState = {
    currency: parseCurrency(row.currency as string),
    generators,
    upgrades,
    automations,
    activeBoosts,
    lastTickAt: new Date(row.last_tick_at as string),
  };

  const meta: MetaProgression = {
    playerId: asPlayerId(row.id as string),
    prestigeCount: row.prestige_count as number,
    permanentMultiplierScaled: BigInt(row.permanent_multiplier_scaled as string),
    totalLifetimeEarnings: parseCurrency(row.total_lifetime_earnings as string),
    research: {
      playerId: asPlayerId(row.id as string),
      researchPoints: parseCurrency(
        typeof row.research_points === 'string' ? row.research_points : '0',
      ),
      unlockedNodeIds: Array.isArray(row.unlocked_node_ids)
        ? (row.unlocked_node_ids as string[]).map((id) => asResearchNodeId(id))
        : [],
    },
  };

  return {
    playerId: asPlayerId(row.id as string),
    themeId: (row.theme_id as string) ?? 'generic',
    run,
    meta,
    claimedRewards,
    processedIdempotencyKeys: Array.isArray(row.idempotency_keys)
      ? (row.idempotency_keys as string[])
      : [],
    version: row.version as number,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function serializeGenerators(run: RunState) {
  return run.generators.map((g) => ({
    id: g.id,
    name: g.name,
    level: g.level,
    baseOutput: g.baseOutput.toString(),
    multiplierScaled: g.multiplierScaled.toString(),
  }));
}

function serializeUpgrades(run: RunState) {
  return run.upgrades.map((u) => ({
    id: u.id,
    name: u.name,
    description: u.description,
    cost: u.cost.toString(),
    purchased: u.purchased,
    targetGeneratorId: u.targetGeneratorId ?? null,
    multiplierBonusScaled: u.multiplierBonusScaled.toString(),
  }));
}

function serializeAutomations(run: RunState) {
  return run.automations.map((a) => ({
    id: a.id,
    generatorId: a.generatorId,
    active: a.active,
  }));
}

function serializeBoosts(run: RunState) {
  return run.activeBoosts.map((b) => ({
    id: b.id,
    multiplierScaled: b.multiplierScaled.toString(),
    expiresAt: b.expiresAt.toISOString(),
  }));
}
