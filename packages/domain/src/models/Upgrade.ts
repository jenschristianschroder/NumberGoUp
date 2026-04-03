import type { UpgradeId, GeneratorId } from '../valueObjects/Identifiers.js';
import type { Currency } from '../valueObjects/Currency.js';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  description: string;
  cost: Currency;
  purchased: boolean;
  /** Which generator this upgrade affects, if any */
  targetGeneratorId?: GeneratorId;
  /** Multiplier bonus applied when purchased (scaled ×1000) */
  multiplierBonusScaled: bigint;
}
