import { describe, it, expect, vi } from 'vitest';
import { claimOfflineEarningsHandler } from '../commands/ClaimOfflineEarnings.js';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { Clock } from '../ports/Clock.js';
import type { PlayerAccount } from '@numbergoUp/domain';
import { asPlayerId, asGeneratorId } from '@numbergoUp/domain';

function makeAccount(): PlayerAccount {
  return {
    playerId: asPlayerId('player-1'),
    run: {
      currency: 0n,
      generators: [
        {
          id: asGeneratorId('gen-1'),
          name: 'Factory',
          level: 1,
          baseOutput: 10n,
          multiplierScaled: 1000n,
        },
      ],
      upgrades: [],
      automations: [],
      activeBoosts: [],
      lastTickAt: new Date('2024-01-01T00:00:00Z'),
    },
    meta: {
      playerId: asPlayerId('player-1'),
      prestigeCount: 0,
      permanentMultiplierScaled: 0n,
      totalLifetimeEarnings: 0n,
    },
    claimedRewards: [],
    processedIdempotencyKeys: [],
    version: 1,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };
}

describe('claimOfflineEarningsHandler', () => {
  it('computes and credits offline earnings', async () => {
    const account = makeAccount();
    let saved: PlayerAccount | null = null;

    const repo: PlayerRepository = {
      findById: vi.fn(async () => account),
      save: vi.fn(async (a) => {
        saved = a;
      }),
      hasProcessedKey: vi.fn(async () => false),
    };

    // 60 seconds after last tick
    const clock: Clock = { now: () => new Date('2024-01-01T00:01:00Z') };

    const result = await claimOfflineEarningsHandler(
      { playerId: 'player-1', idempotencyKey: 'idem-offline-1' },
      repo,
      clock,
    );

    // 10/s * 60s = 600 (no meta multiplier)
    expect(result.earned).toBe(600n);
    expect(result.newCurrency).toBe(600n);
    expect(result.secondsElapsed).toBe(60);
    expect(saved).not.toBeNull();
    expect((saved as unknown as PlayerAccount).run.currency).toBe(600n);
  });

  it('is idempotent on duplicate key', async () => {
    const account = makeAccount();
    account.processedIdempotencyKeys = ['idem-dup'];

    const repo: PlayerRepository = {
      findById: vi.fn(async () => account),
      save: vi.fn(),
      hasProcessedKey: vi.fn(async () => false),
    };

    const clock: Clock = { now: () => new Date('2024-01-01T01:00:00Z') };

    const result = await claimOfflineEarningsHandler(
      { playerId: 'player-1', idempotencyKey: 'idem-dup' },
      repo,
      clock,
    );

    expect(result.earned).toBe(0n);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
