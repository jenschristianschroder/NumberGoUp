import type { GeneratorId } from '../valueObjects/Identifiers.js';
import type { Currency } from '../valueObjects/Currency.js';
import { applyCurrencyMultiplier } from '../valueObjects/Currency.js';

/**
 * Generator – a currency-producing machine.
 *
 * output per second = baseOutput * multiplier / 1000
 * All stored values are integers; multiplier is scaled ×1000.
 */
export interface Generator {
  id: GeneratorId;
  name: string;
  level: number;
  /** Base output per second as integer currency units */
  baseOutput: Currency;
  /** Effective multiplier scaled ×1000 (1000 = 1×, 1500 = 1.5×) */
  multiplierScaled: bigint;
}

export function generatorOutputPerSecond(g: Generator): Currency {
  return applyCurrencyMultiplier(g.baseOutput, g.multiplierScaled);
}

export function applyUpgradeToGenerator(
  g: Generator,
  additionalMultiplierScaled: bigint,
): Generator {
  return {
    ...g,
    multiplierScaled: g.multiplierScaled + additionalMultiplierScaled,
  };
}
