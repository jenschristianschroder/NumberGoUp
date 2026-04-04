import type { GameTheme } from '../models/GameTheme.js';
import { asGeneratorId, asUpgradeId, asResearchNodeId } from '../valueObjects/Identifiers.js';

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
  researchPointsPerPrestige: 10n,
  researchNodes: [
    // ── Economy branch ──────────────────────────────────────────────────────
    {
      id: asResearchNodeId('research-economy-1'),
      name: 'Optimised Output I',
      description: 'All generators gain +0.2× output.',
      cost: 5n,
      prerequisites: [],
      effects: [{ type: 'generator_multiplier', value: 200n }],
      branch: 'economy',
      isMilestone: false,
    },
    {
      id: asResearchNodeId('research-economy-2'),
      name: 'Optimised Output II',
      description: 'All generators gain +0.3× output.',
      cost: 15n,
      prerequisites: [asResearchNodeId('research-economy-1')],
      effects: [{ type: 'generator_multiplier', value: 300n }],
      branch: 'economy',
      isMilestone: true,
    },
    {
      id: asResearchNodeId('research-economy-3'),
      name: 'Optimised Output III',
      description: 'All generators gain +0.5× output.',
      cost: 40n,
      prerequisites: [asResearchNodeId('research-economy-2')],
      effects: [{ type: 'generator_multiplier', value: 500n }],
      branch: 'economy',
      isMilestone: false,
    },
    // ── Prestige branch ─────────────────────────────────────────────────────
    {
      id: asResearchNodeId('research-prestige-1'),
      name: 'Prestige Mastery I',
      description: 'Prestige rewards are +0.2× stronger.',
      cost: 10n,
      prerequisites: [],
      effects: [{ type: 'prestige_multiplier', value: 200n }],
      branch: 'prestige',
      isMilestone: false,
    },
    {
      id: asResearchNodeId('research-prestige-2'),
      name: 'Prestige Mastery II',
      description: 'Prestige rewards are +0.3× stronger.',
      cost: 25n,
      prerequisites: [asResearchNodeId('research-prestige-1')],
      effects: [{ type: 'prestige_multiplier', value: 300n }],
      branch: 'prestige',
      isMilestone: true,
    },
    // ── Offline branch ──────────────────────────────────────────────────────
    {
      id: asResearchNodeId('research-offline-1'),
      name: 'Extended Downtime I',
      description: 'Offline earnings cap increased by 2 hours.',
      cost: 10n,
      prerequisites: [],
      effects: [{ type: 'offline_max_seconds', value: 7200n }],
      branch: 'offline',
      isMilestone: false,
    },
    {
      id: asResearchNodeId('research-offline-2'),
      name: 'Extended Downtime II',
      description: 'Offline earnings cap increased by another 4 hours.',
      cost: 30n,
      prerequisites: [asResearchNodeId('research-offline-1')],
      effects: [{ type: 'offline_max_seconds', value: 14400n }],
      branch: 'offline',
      isMilestone: true,
    },
    // ── Boost branch ────────────────────────────────────────────────────────
    {
      id: asResearchNodeId('research-boost-1'),
      name: 'Boost Amplifier',
      description: 'Timed boosts are +0.5× more effective.',
      cost: 20n,
      prerequisites: [],
      effects: [{ type: 'boost_effectiveness', value: 500n }],
      branch: 'boost',
      isMilestone: false,
    },
  ],
};
