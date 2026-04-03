import { describe, it, expect } from 'vitest';
import {
  computeOfflineEarnings,
  MAX_OFFLINE_SECONDS,
  applyMetaMultiplier,
} from '../EconomyService.js';
import type { RunState } from '../models/PlayerAccount.js';
import { asGeneratorId } from '../valueObjects/Identifiers.js';

function makeRunState(overrides?: Partial<RunState>): RunState {
  return {
    currency: 0n,
    generators: [
      {
        id: asGeneratorId('gen-1'),
        name: 'Widget Factory',
        level: 1,
        baseOutput: 10n, // 10 currency/second
        multiplierScaled: 1000n, // ×1
      },
    ],
    upgrades: [],
    automations: [],
    activeBoosts: [],
    lastTickAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('computeOfflineEarnings', () => {
  it('returns 0 when no time has elapsed', () => {
    const run = makeRunState();
    const now = new Date('2024-01-01T00:00:00Z');
    const { earned, secondsElapsed } = computeOfflineEarnings(run, now);
    expect(earned).toBe(0n);
    expect(secondsElapsed).toBe(0);
  });

  it('computes correct earnings for 60 seconds', () => {
    const run = makeRunState();
    const now = new Date('2024-01-01T00:01:00Z'); // +60s
    const { earned, secondsElapsed } = computeOfflineEarnings(run, now);
    // 10/s * 60s * 1× multiplier = 600
    expect(earned).toBe(600n);
    expect(secondsElapsed).toBe(60);
  });

  it('caps earnings at MAX_OFFLINE_SECONDS', () => {
    const run = makeRunState({ lastTickAt: new Date('2024-01-01T00:00:00Z') });
    // 24 hours later – should be capped at 8h
    const now = new Date('2024-01-02T00:00:00Z');
    const { secondsElapsed } = computeOfflineEarnings(run, now);
    expect(secondsElapsed).toBe(MAX_OFFLINE_SECONDS);
  });

  it('applies an active timed boost', () => {
    const now = new Date('2024-01-01T00:01:00Z');
    const run = makeRunState({
      activeBoosts: [
        {
          id: 'boost-1',
          multiplierScaled: 1000n, // +1× bonus → effective 2×
          expiresAt: new Date('2024-01-02T00:00:00Z'),
        },
      ],
    });
    const { earned } = computeOfflineEarnings(run, now);
    // 10/s * 60s * 2× = 1200
    expect(earned).toBe(1200n);
  });

  it('ignores expired boosts', () => {
    const now = new Date('2024-01-01T01:00:00Z');
    const run = makeRunState({
      activeBoosts: [
        {
          id: 'boost-expired',
          multiplierScaled: 1000n,
          expiresAt: new Date('2024-01-01T00:30:00Z'), // expired before "now"
        },
      ],
    });
    const { earned } = computeOfflineEarnings(run, now);
    // Should use 1× only: 10/s * 3600s = 36000
    expect(earned).toBe(36000n);
  });
});

describe('applyMetaMultiplier', () => {
  it('applies no bonus when permanentMultiplierScaled is 0', () => {
    expect(applyMetaMultiplier(1000n, 0n)).toBe(1000n);
  });

  it('doubles earnings with permanentMultiplierScaled = 1000', () => {
    // 1000 + 1000 = 2000 scaled → ×2
    expect(applyMetaMultiplier(1000n, 1000n)).toBe(2000n);
  });
});
