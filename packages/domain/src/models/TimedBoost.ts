import type { Currency } from '../valueObjects/Currency.js';

/**
 * TimedBoost – a temporary multiplier applied to currency output.
 */
export interface TimedBoost {
  id: string;
  /** Multiplier bonus scaled ×1000 */
  multiplierScaled: bigint;
  expiresAt: Date;
}

export function isBoostActive(boost: TimedBoost, now: Date): boolean {
  return now < boost.expiresAt;
}

/**
 * Compute the combined boost multiplier scaled ×1000 for all active boosts.
 * Boosts are additive. Base is 1000 (= 1×).
 */
export function combinedBoostMultiplierScaled(boosts: TimedBoost[], now: Date): bigint {
  return boosts
    .filter((b) => isBoostActive(b, now))
    .reduce((acc, b) => acc + b.multiplierScaled, 0n);
}

// keep Currency import used by doc-comment only – exported for convenience
export type { Currency };
