import type { PlayerId } from '../valueObjects/Identifiers.js';
import type { Currency } from '../valueObjects/Currency.js';

/**
 * MetaProgression – permanent bonuses that survive prestige resets.
 */
export interface MetaProgression {
  playerId: PlayerId;
  prestigeCount: number;
  /** Permanent multiplier bonus accumulated through prestige (scaled ×1000) */
  permanentMultiplierScaled: bigint;
  /** All-time earnings across all runs */
  totalLifetimeEarnings: Currency;
}

/** Bonus applied per prestige (scaled ×1000). Currently +100 = +0.1× per prestige. */
export const PRESTIGE_MULTIPLIER_INCREMENT_SCALED = 100n;

export function computePrestigeBonus(current: MetaProgression): MetaProgression {
  return {
    ...current,
    prestigeCount: current.prestigeCount + 1,
    permanentMultiplierScaled:
      current.permanentMultiplierScaled + PRESTIGE_MULTIPLIER_INCREMENT_SCALED,
  };
}
