import { describe, it, expect } from 'vitest';
import { createRunStateFromTheme } from '../models/GameTheme.js';
import type { GameTheme } from '../models/GameTheme.js';
import { asGeneratorId, asUpgradeId } from '../valueObjects/Identifiers.js';
import { genericTheme, findThemeById, listThemes } from '../themes/index.js';

function makeTheme(overrides?: Partial<GameTheme>): GameTheme {
  return {
    id: 'test-theme',
    name: 'Test Theme',
    description: 'A test theme.',
    generators: [
      {
        id: asGeneratorId('gen-1'),
        name: 'Gen 1',
        baseOutput: 10n,
        multiplierScaled: 1000n,
      },
      {
        id: asGeneratorId('gen-2'),
        name: 'Gen 2',
        baseOutput: 50n,
        multiplierScaled: 1500n,
      },
    ],
    upgrades: [
      {
        id: asUpgradeId('upg-1'),
        name: 'Upgrade 1',
        description: 'Boosts gen-1',
        cost: 100n,
        targetGeneratorId: asGeneratorId('gen-1'),
        multiplierBonusScaled: 500n,
      },
    ],
    initialCurrency: 200n,
    prestigeThreshold: 1_000_000n,
    maxOfflineSeconds: 28800,
    researchPointsPerPrestige: 10n,
    researchNodes: [],
    ...overrides,
  };
}

describe('createRunStateFromTheme', () => {
  it('creates generators from templates at level 1', () => {
    const theme = makeTheme();
    const now = new Date('2024-06-01T00:00:00Z');
    const run = createRunStateFromTheme(theme, now);

    expect(run.generators).toHaveLength(2);
    expect(run.generators[0]).toEqual({
      id: asGeneratorId('gen-1'),
      name: 'Gen 1',
      level: 1,
      baseOutput: 10n,
      multiplierScaled: 1000n,
    });
    expect(run.generators[1]).toEqual({
      id: asGeneratorId('gen-2'),
      name: 'Gen 2',
      level: 1,
      baseOutput: 50n,
      multiplierScaled: 1500n,
    });
  });

  it('creates upgrades from templates as unpurchased', () => {
    const theme = makeTheme();
    const now = new Date('2024-06-01T00:00:00Z');
    const run = createRunStateFromTheme(theme, now);

    expect(run.upgrades).toHaveLength(1);
    expect(run.upgrades[0].purchased).toBe(false);
    expect(run.upgrades[0].id).toBe('upg-1');
    expect(run.upgrades[0].cost).toBe(100n);
    expect(run.upgrades[0].targetGeneratorId).toBe('gen-1');
  });

  it('sets initial currency from theme', () => {
    const theme = makeTheme({ initialCurrency: 500n });
    const now = new Date('2024-06-01T00:00:00Z');
    const run = createRunStateFromTheme(theme, now);

    expect(run.currency).toBe(500n);
  });

  it('initializes automations and boosts as empty', () => {
    const theme = makeTheme();
    const now = new Date('2024-06-01T00:00:00Z');
    const run = createRunStateFromTheme(theme, now);

    expect(run.automations).toEqual([]);
    expect(run.activeBoosts).toEqual([]);
  });

  it('sets lastTickAt to the provided timestamp', () => {
    const theme = makeTheme();
    const now = new Date('2024-06-01T12:30:00Z');
    const run = createRunStateFromTheme(theme, now);

    expect(run.lastTickAt).toEqual(now);
  });

  it('handles theme with empty generators and upgrades', () => {
    const theme = makeTheme({ generators: [], upgrades: [] });
    const now = new Date('2024-06-01T00:00:00Z');
    const run = createRunStateFromTheme(theme, now);

    expect(run.generators).toEqual([]);
    expect(run.upgrades).toEqual([]);
    expect(run.currency).toBe(200n);
  });
});

describe('genericTheme', () => {
  it('has the id "generic"', () => {
    expect(genericTheme.id).toBe('generic');
  });

  it('has at least 3 generators', () => {
    expect(genericTheme.generators.length).toBeGreaterThanOrEqual(3);
  });

  it('has at least 3 upgrades', () => {
    expect(genericTheme.upgrades.length).toBeGreaterThanOrEqual(3);
  });

  it('all generators start with 1000 multiplier (1×)', () => {
    for (const gen of genericTheme.generators) {
      expect(gen.multiplierScaled).toBe(1000n);
    }
  });

  it('initialCurrency is a positive value', () => {
    expect(genericTheme.initialCurrency).toBeGreaterThan(0n);
  });

  it('prestigeThreshold matches the legacy constant', () => {
    expect(genericTheme.prestigeThreshold).toBe(1_000_000n);
  });

  it('maxOfflineSeconds matches the legacy constant (8h)', () => {
    expect(genericTheme.maxOfflineSeconds).toBe(8 * 60 * 60);
  });

  it('creates a valid RunState', () => {
    const now = new Date('2024-06-01T00:00:00Z');
    const run = createRunStateFromTheme(genericTheme, now);

    expect(run.generators.length).toBe(genericTheme.generators.length);
    expect(run.upgrades.length).toBe(genericTheme.upgrades.length);
    expect(run.currency).toBe(genericTheme.initialCurrency);
  });
});

describe('findThemeById', () => {
  it('returns the generic theme', () => {
    expect(findThemeById('generic')).toBe(genericTheme);
  });

  it('returns undefined for unknown theme', () => {
    expect(findThemeById('nonexistent')).toBeUndefined();
  });
});

describe('listThemes', () => {
  it('returns at least one theme', () => {
    const themes = listThemes();
    expect(themes.length).toBeGreaterThanOrEqual(1);
  });

  it('includes the generic theme', () => {
    const themes = listThemes();
    expect(themes.some((t) => t.id === 'generic')).toBe(true);
  });
});
