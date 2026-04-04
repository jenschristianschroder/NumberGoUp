import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buyUpgradeHandler } from '../commands/BuyUpgrade.js';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { Clock } from '../ports/Clock.js';
import type { PlayerAccount } from '@numbergoUp/domain';
import {
  asPlayerId,
  asGeneratorId,
  asUpgradeId,
  InsufficientFundsError,
  UpgradeAlreadyPurchasedError,
  UpgradeNotFoundError,
  PlayerNotFoundError,
} from '@numbergoUp/domain';

function makeAccount(overrides?: Partial<PlayerAccount>): PlayerAccount {
  return {
    playerId: asPlayerId('player-1'),
    themeId: 'generic',
    run: {
      currency: 1000n,
      generators: [
        {
          id: asGeneratorId('gen-1'),
          name: 'Factory',
          level: 1,
          baseOutput: 10n,
          multiplierScaled: 1000n,
        },
      ],
      upgrades: [
        {
          id: asUpgradeId('upgrade-1'),
          name: 'Speed Boost',
          description: 'Faster factory',
          cost: 500n,
          purchased: false,
          targetGeneratorId: asGeneratorId('gen-1'),
          multiplierBonusScaled: 500n,
        },
      ],
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

function makeMockRepo(account: PlayerAccount | null): PlayerRepository {
  let stored = account;
  return {
    findById: vi.fn(async () => stored),
    create: vi.fn(async (a: PlayerAccount) => {
      stored = a;
    }),
    save: vi.fn(async (a: PlayerAccount) => {
      stored = a;
    }),
    hasProcessedKey: vi.fn(async () => false),
  };
}

const fixedClock: Clock = { now: () => new Date('2024-01-01T12:00:00Z') };

describe('buyUpgradeHandler', () => {
  it('purchases an upgrade and deducts currency', async () => {
    const account = makeAccount();
    const repo = makeMockRepo(account);

    const result = await buyUpgradeHandler(
      { playerId: 'player-1', upgradeId: 'upgrade-1', idempotencyKey: 'idem-1' },
      repo,
      fixedClock,
    );

    expect(result.newCurrency).toBe(500n); // 1000 - 500
    expect(result.upgradeId).toBe('upgrade-1');
    expect(repo.save).toHaveBeenCalledOnce();

    const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as PlayerAccount;
    expect(saved.run.currency).toBe(500n);
    expect(saved.run.upgrades[0].purchased).toBe(true);
    expect(saved.run.generators[0].multiplierScaled).toBe(1500n); // 1000 + 500 bonus
  });

  it('throws InsufficientFundsError when balance is too low', async () => {
    const account = makeAccount();
    account.run.currency = 100n;
    const repo = makeMockRepo(account);

    await expect(
      buyUpgradeHandler(
        { playerId: 'player-1', upgradeId: 'upgrade-1', idempotencyKey: 'idem-2' },
        repo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it('throws UpgradeAlreadyPurchasedError for already-purchased upgrade', async () => {
    const account = makeAccount();
    account.run.upgrades[0].purchased = true;
    const repo = makeMockRepo(account);

    await expect(
      buyUpgradeHandler(
        { playerId: 'player-1', upgradeId: 'upgrade-1', idempotencyKey: 'idem-3' },
        repo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(UpgradeAlreadyPurchasedError);
  });

  it('throws UpgradeNotFoundError for unknown upgrade', async () => {
    const repo = makeMockRepo(makeAccount());

    await expect(
      buyUpgradeHandler(
        { playerId: 'player-1', upgradeId: 'upgrade-unknown', idempotencyKey: 'idem-4' },
        repo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(UpgradeNotFoundError);
  });

  it('throws PlayerNotFoundError when player does not exist', async () => {
    const repo = makeMockRepo(null);

    await expect(
      buyUpgradeHandler(
        { playerId: 'ghost', upgradeId: 'upgrade-1', idempotencyKey: 'idem-5' },
        repo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(PlayerNotFoundError);
  });

  it('is idempotent: returns same result without mutating on duplicate key', async () => {
    const account = makeAccount();
    account.processedIdempotencyKeys = ['idem-dup'];
    account.run.currency = 500n;
    const repo = makeMockRepo(account);

    const result = await buyUpgradeHandler(
      { playerId: 'player-1', upgradeId: 'upgrade-1', idempotencyKey: 'idem-dup' },
      repo,
      fixedClock,
    );

    expect(result.newCurrency).toBe(500n);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
