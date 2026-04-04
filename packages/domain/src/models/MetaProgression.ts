import type { PlayerId } from '../valueObjects/Identifiers.js';
import type { Currency } from '../valueObjects/Currency.js';
import type { ResearchState } from './ResearchState.js';

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
  /** Permanent research progression. */
  research: ResearchState;
}

/** Bonus applied per prestige (scaled ×1000). Currently +100 = +0.1× per prestige. */
export const PRESTIGE_MULTIPLIER_INCREMENT_SCALED = 100n;

export function computePrestigeBonus(
  current: MetaProgression,
  researchPointsAwarded: Currency = 0n,
): MetaProgression {
  return {
    ...current,
    prestigeCount: current.prestigeCount + 1,
    permanentMultiplierScaled:
      current.permanentMultiplierScaled + PRESTIGE_MULTIPLIER_INCREMENT_SCALED,
    research: {
      ...current.research,
      researchPoints: current.research.researchPoints + researchPointsAwarded,
    },
  };
}
