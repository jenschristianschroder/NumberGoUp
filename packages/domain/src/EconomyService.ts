import type { PlayerAccount } from './models/PlayerAccount.js';
import type { RunState } from './models/PlayerAccount.js';
import type { Generator } from './models/Generator.js';
import { generatorOutputPerSecond } from './models/Generator.js';
import type { TimedBoost } from './models/TimedBoost.js';
import { combinedBoostMultiplierScaled } from './models/TimedBoost.js';
import { applyCurrencyMultiplier } from './valueObjects/Currency.js';
import type { Currency } from './valueObjects/Currency.js';

/** Maximum elapsed seconds that offline earnings will be computed for. */
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60; // 8 hours

/**
 * Compute offline earnings for a run state.
 *
 * Returns the integer currency earned and the clamped elapsed seconds.
 * NOTE: Always call with server-generated `now` – never trust client-supplied time.
 */
export function computeOfflineEarnings(
  run: RunState,
  now: Date,
): { earned: Currency; secondsElapsed: number } {
  const rawSeconds = Math.floor((now.getTime() - run.lastTickAt.getTime()) / 1000);
  const secondsElapsed = Math.min(rawSeconds, MAX_OFFLINE_SECONDS);

  const boostMultiplierScaled = combinedBoostMultiplierScaled(run.activeBoosts, now);
  // Base multiplier is 1000 (=1×); boosts are additive on top
  const effectiveMultiplierScaled = 1000n + boostMultiplierScaled;

  let earned = 0n;
  for (const g of run.generators) {
    const perSecond = generatorOutputPerSecond(g);
    const raw = perSecond * BigInt(secondsElapsed);
    earned += applyCurrencyMultiplier(raw, effectiveMultiplierScaled);
  }

  return { earned, secondsElapsed };
}

/**
 * Apply the meta-progression permanent multiplier on top of earnings.
 */
export function applyMetaMultiplier(
  earned: Currency,
  permanentMultiplierScaled: bigint,
): Currency {
  // 1000 base + permanentMultiplierScaled
  return applyCurrencyMultiplier(earned, 1000n + permanentMultiplierScaled);
}

/**
 * Compute the total output per second for a run (sum of all generators).
 */
export function totalOutputPerSecond(generators: Generator[], boosts: TimedBoost[], now: Date): Currency {
  const boostMultiplier = combinedBoostMultiplierScaled(boosts, now);
  const effectiveMultiplierScaled = 1000n + boostMultiplier;

  let total = 0n;
  for (const g of generators) {
    total += applyCurrencyMultiplier(generatorOutputPerSecond(g), effectiveMultiplierScaled);
  }
  return total;
}

/** The minimum lifetime earnings required to perform a prestige reset. */
export const PRESTIGE_MINIMUM_LIFETIME_EARNINGS = 1_000_000n;

export function canPrestige(account: PlayerAccount): boolean {
  return account.meta.totalLifetimeEarnings >= PRESTIGE_MINIMUM_LIFETIME_EARNINGS;
}
