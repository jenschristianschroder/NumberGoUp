import type { PlayerId } from '../valueObjects/Identifiers.js';
import type { Currency } from '../valueObjects/Currency.js';
import type { Generator } from './Generator.js';
import type { Upgrade } from './Upgrade.js';
import type { Automation } from './Automation.js';
import type { MetaProgression } from './MetaProgression.js';
import type { TimedBoost } from './TimedBoost.js';
import type { RewardClaim } from './LiveEvent.js';

/**
 * RunState – the mutable per-run state that resets on prestige.
 */
export interface RunState {
  currency: Currency;
  generators: Generator[];
  upgrades: Upgrade[];
  automations: Automation[];
  activeBoosts: TimedBoost[];
  /** Server-side UTC timestamp of the last processed tick */
  lastTickAt: Date;
}

/**
 * PlayerAccount – the root aggregate that wraps a player's full state.
 *
 * version is the optimistic-concurrency token.  Every write increments it.
 * The persistence layer rejects writes where the stored version != expected.
 */
export interface PlayerAccount {
  playerId: PlayerId;
  run: RunState;
  meta: MetaProgression;
  claimedRewards: RewardClaim[];
  /** Idempotency keys of recently processed commands (last ~100 entries). */
  processedIdempotencyKeys: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
