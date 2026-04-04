import { describe, it, expect, vi } from 'vitest';
import { createAccountHandler } from '../commands/CreateAccount.js';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { ThemeRepository } from '../ports/ThemeRepository.js';
import type { Clock } from '../ports/Clock.js';
import type { PlayerAccount, GameTheme } from '@numbergoUp/domain';
import {
  asPlayerId,
  asGeneratorId,
  asUpgradeId,
  PlayerAlreadyExistsError,
  ThemeNotFoundError,
} from '@numbergoUp/domain';

const fixedClock: Clock = { now: () => new Date('2024-06-01T12:00:00Z') };

function makeTheme(): GameTheme {
  return {
    id: 'test-theme',
    name: 'Test Theme',
    description: 'A test theme',
    generators: [
      {
        id: asGeneratorId('gen-1'),
        name: 'Gen 1',
        baseOutput: 10n,
        multiplierScaled: 1000n,
      },
    ],
    upgrades: [
      {
        id: asUpgradeId('upg-1'),
        name: 'Upgrade 1',
        description: 'Boost',
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
  };
}

function makeMockPlayerRepo(existing: PlayerAccount | null = null): PlayerRepository {
  let stored = existing;
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

function makeMockThemeRepo(theme: GameTheme | undefined = makeTheme()): ThemeRepository {
  return {
    findById: vi.fn((id: string) => (theme && theme.id === id ? theme : undefined)),
    listAll: vi.fn(() => (theme ? [theme] : [])),
  };
}

describe('createAccountHandler', () => {
  it('creates a new account from a theme', async () => {
    const playerRepo = makeMockPlayerRepo(null);
    const themeRepo = makeMockThemeRepo();

    const result = await createAccountHandler(
      { playerId: 'player-1', themeId: 'test-theme', idempotencyKey: 'idem-1' },
      playerRepo,
      themeRepo,
      fixedClock,
    );

    expect(result.playerId).toBe('player-1');
    expect(result.themeId).toBe('test-theme');
    expect(result.version).toBe(1);
    expect(playerRepo.create).toHaveBeenCalledOnce();

    const saved = (playerRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0] as PlayerAccount;
    expect(saved.playerId).toBe('player-1');
    expect(saved.themeId).toBe('test-theme');
    expect(saved.run.currency).toBe(200n);
    expect(saved.run.generators).toHaveLength(1);
    expect(saved.run.generators[0].name).toBe('Gen 1');
    expect(saved.run.generators[0].level).toBe(1);
    expect(saved.run.upgrades).toHaveLength(1);
    expect(saved.run.upgrades[0].purchased).toBe(false);
    expect(saved.meta.prestigeCount).toBe(0);
    expect(saved.meta.permanentMultiplierScaled).toBe(0n);
    expect(saved.meta.totalLifetimeEarnings).toBe(0n);
    expect(saved.processedIdempotencyKeys).toContain('idem-1');
    expect(saved.version).toBe(1);
    expect(saved.createdAt).toEqual(fixedClock.now());
  });

  it('returns existing account on duplicate idempotency key', async () => {
    const existing: PlayerAccount = {
      playerId: asPlayerId('player-1'),
      themeId: 'original-theme',
      run: {
        currency: 500n,
        generators: [],
        upgrades: [],
        automations: [],
        activeBoosts: [],
        lastTickAt: new Date('2024-06-01T12:00:00Z'),
      },
      meta: {
        playerId: asPlayerId('player-1'),
        prestigeCount: 0,
        permanentMultiplierScaled: 0n,
        totalLifetimeEarnings: 0n,
        research: {
          playerId: asPlayerId('player-1'),
          researchPoints: 0n,
          unlockedNodeIds: [],
        },
      },
      claimedRewards: [],
      processedIdempotencyKeys: ['idem-dup'],
      version: 1,
      createdAt: new Date('2024-06-01T12:00:00Z'),
      updatedAt: new Date('2024-06-01T12:00:00Z'),
    };

    const playerRepo = makeMockPlayerRepo(existing);
    const themeRepo = makeMockThemeRepo();

    const result = await createAccountHandler(
      { playerId: 'player-1', themeId: 'different-theme', idempotencyKey: 'idem-dup' },
      playerRepo,
      themeRepo,
      fixedClock,
    );

    expect(result.playerId).toBe('player-1');
    expect(result.themeId).toBe('original-theme');
    expect(result.version).toBe(1);
    expect(playerRepo.create).not.toHaveBeenCalled();
    expect(playerRepo.save).not.toHaveBeenCalled();
  });

  it('throws PlayerAlreadyExistsError when player exists with different key', async () => {
    const existing: PlayerAccount = {
      playerId: asPlayerId('player-1'),
      themeId: 'test-theme',
      run: {
        currency: 500n,
        generators: [],
        upgrades: [],
        automations: [],
        activeBoosts: [],
        lastTickAt: new Date('2024-06-01T12:00:00Z'),
      },
      meta: {
        playerId: asPlayerId('player-1'),
        prestigeCount: 0,
        permanentMultiplierScaled: 0n,
        totalLifetimeEarnings: 0n,
        research: {
          playerId: asPlayerId('player-1'),
          researchPoints: 0n,
          unlockedNodeIds: [],
        },
      },
      claimedRewards: [],
      processedIdempotencyKeys: ['idem-other'],
      version: 1,
      createdAt: new Date('2024-06-01T12:00:00Z'),
      updatedAt: new Date('2024-06-01T12:00:00Z'),
    };

    const playerRepo = makeMockPlayerRepo(existing);
    const themeRepo = makeMockThemeRepo();

    await expect(
      createAccountHandler(
        { playerId: 'player-1', themeId: 'test-theme', idempotencyKey: 'idem-new' },
        playerRepo,
        themeRepo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(PlayerAlreadyExistsError);
  });

  it('throws ThemeNotFoundError for unknown theme', async () => {
    const playerRepo = makeMockPlayerRepo(null);
    const themeRepo = makeMockThemeRepo();

    await expect(
      createAccountHandler(
        { playerId: 'player-1', themeId: 'nonexistent', idempotencyKey: 'idem-2' },
        playerRepo,
        themeRepo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(ThemeNotFoundError);
  });
});
