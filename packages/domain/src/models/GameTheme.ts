import type { GeneratorId, UpgradeId } from '../valueObjects/Identifiers.js';
import type { Currency } from '../valueObjects/Currency.js';
import type { RunState } from './PlayerAccount.js';
import type { Generator } from './Generator.js';
import type { Upgrade } from './Upgrade.js';

/**
 * GeneratorTemplate – blueprint for a generator used by a theme.
 * Level and purchase state are not included; they are always initialized fresh.
 */
export interface GeneratorTemplate {
  id: GeneratorId;
  name: string;
  baseOutput: Currency;
  /** Starting multiplier scaled ×1000 (1000 = 1×) */
  multiplierScaled: bigint;
}

/**
 * UpgradeTemplate – blueprint for an upgrade used by a theme.
 */
export interface UpgradeTemplate {
  id: UpgradeId;
  name: string;
  description: string;
  cost: Currency;
  /** Which generator this upgrade affects, if any */
  targetGeneratorId?: GeneratorId;
  /** Multiplier bonus applied when purchased (scaled ×1000) */
  multiplierBonusScaled: bigint;
}

/**
 * GameTheme – a content blueprint that defines the generators, upgrades,
 * economy constants, and flavor for a particular game theme.
 *
 * Themes are pure data: no I/O, no framework dependencies.
 */
export interface GameTheme {
  id: string;
  name: string;
  description: string;
  generators: GeneratorTemplate[];
  upgrades: UpgradeTemplate[];
  /** Starting currency for a new run */
  initialCurrency: Currency;
  /** Minimum lifetime earnings to perform a prestige reset */
  prestigeThreshold: Currency;
  /** Maximum seconds of offline earnings to compute */
  maxOfflineSeconds: number;
}

/**
 * Create a fresh RunState from a theme definition.
 *
 * All generators start at level 1 with the template multiplier.
 * All upgrades start as unpurchased.
 * `lastTickAt` must be set by the caller (using the Clock port).
 */
export function createRunStateFromTheme(theme: GameTheme, now: Date): RunState {
  const generators: Generator[] = theme.generators.map((t) => ({
    id: t.id,
    name: t.name,
    level: 1,
    baseOutput: t.baseOutput,
    multiplierScaled: t.multiplierScaled,
  }));

  const upgrades: Upgrade[] = theme.upgrades.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    cost: t.cost,
    purchased: false,
    targetGeneratorId: t.targetGeneratorId,
    multiplierBonusScaled: t.multiplierBonusScaled,
  }));

  return {
    currency: theme.initialCurrency,
    generators,
    upgrades,
    automations: [],
    activeBoosts: [],
    lastTickAt: now,
  };
}
