import type { GameTheme } from '../models/GameTheme.js';
import { asGeneratorId, asUpgradeId } from '../valueObjects/Identifiers.js';

/**
 * Generic test theme – neutral names and balanced values for initial testing.
 *
 * Generators produce increasing output at increasing cost (via upgrades).
 * Upgrades target specific generators with multiplier bonuses.
 */
export const genericTheme: GameTheme = {
  id: 'generic',
  name: 'Generic',
  description: 'A basic theme for testing the core game mechanics.',
  generators: [
    {
      id: asGeneratorId('gen-small'),
      name: 'Small Generator',
      baseOutput: 1n,
      multiplierScaled: 1000n,
    },
    {
      id: asGeneratorId('gen-medium'),
      name: 'Medium Generator',
      baseOutput: 5n,
      multiplierScaled: 1000n,
    },
    {
      id: asGeneratorId('gen-large'),
      name: 'Large Generator',
      baseOutput: 25n,
      multiplierScaled: 1000n,
    },
    {
      id: asGeneratorId('gen-mega'),
      name: 'Mega Generator',
      baseOutput: 100n,
      multiplierScaled: 1000n,
    },
  ],
  upgrades: [
    {
      id: asUpgradeId('upgrade-efficiency-1'),
      name: 'Efficiency I',
      description: 'Adds +0.5× to the Small Generator multiplier.',
      cost: 100n,
      targetGeneratorId: asGeneratorId('gen-small'),
      multiplierBonusScaled: 500n,
    },
    {
      id: asUpgradeId('upgrade-efficiency-2'),
      name: 'Efficiency II',
      description: 'Adds +0.5× to the Medium Generator multiplier.',
      cost: 500n,
      targetGeneratorId: asGeneratorId('gen-medium'),
      multiplierBonusScaled: 500n,
    },
    {
      id: asUpgradeId('upgrade-efficiency-3'),
      name: 'Efficiency III',
      description: 'Adds +0.5× to the Large Generator multiplier.',
      cost: 2500n,
      targetGeneratorId: asGeneratorId('gen-large'),
      multiplierBonusScaled: 500n,
    },
    {
      id: asUpgradeId('upgrade-efficiency-4'),
      name: 'Efficiency IV',
      description: 'Adds +0.5× to the Mega Generator multiplier.',
      cost: 10000n,
      targetGeneratorId: asGeneratorId('gen-mega'),
      multiplierBonusScaled: 500n,
    },
    {
      id: asUpgradeId('upgrade-global-boost'),
      name: 'Global Boost',
      description: 'A general purpose multiplier boost applied globally.',
      cost: 50000n,
      multiplierBonusScaled: 1000n,
    },
  ],
  initialCurrency: 100n,
  prestigeThreshold: 1_000_000n,
  maxOfflineSeconds: 8 * 60 * 60,
};
