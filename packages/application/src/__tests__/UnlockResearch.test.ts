import { describe, it, expect, vi } from 'vitest';
import { unlockResearchHandler } from '../commands/UnlockResearch.js';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { ThemeRepository } from '../ports/ThemeRepository.js';
import type { Clock } from '../ports/Clock.js';
import type { PlayerAccount, GameTheme } from '@numbergoUp/domain';
import {
  asPlayerId,
  asGeneratorId,
  asUpgradeId,
  asResearchNodeId,
  PlayerNotFoundError,
  ResearchNodeNotFoundError,
  ResearchNodeAlreadyUnlockedError,
  ResearchPrerequisitesNotMetError,
  InsufficientResearchPointsError,
} from '@numbergoUp/domain';

const fixedClock: Clock = { now: () => new Date('2024-01-01T12:00:00Z') };

function makeTheme(): GameTheme {
  return {
    id: 'generic',
    name: 'Generic',
    description: 'Test theme',
    generators: [
      { id: asGeneratorId('gen-1'), name: 'Gen 1', baseOutput: 10n, multiplierScaled: 1000n },
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
    researchNodes: [
      {
        id: asResearchNodeId('research-1'),
        name: 'Research 1',
        description: 'First node',
        cost: 5n,
        prerequisites: [],
        effects: [{ type: 'generator_multiplier', value: 200n }],
        branch: 'economy',
        isMilestone: false,
      },
      {
        id: asResearchNodeId('research-2'),
        name: 'Research 2',
        description: 'Second node (requires research-1)',
        cost: 10n,
        prerequisites: [asResearchNodeId('research-1')],
        effects: [{ type: 'generator_multiplier', value: 300n }],
        branch: 'economy',
        isMilestone: true,
      },
    ],
  };
}

function makeAccount(overrides?: Partial<PlayerAccount>): PlayerAccount {
  return {
    playerId: asPlayerId('player-1'),
    themeId: 'generic',
    run: {
      currency: 1000n,
      generators: [
        {
          id: asGeneratorId('gen-1'),
          name: 'Gen 1',
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
      prestigeCount: 1,
      permanentMultiplierScaled: 100n,
      totalLifetimeEarnings: 2_000_000n,
      research: {
        playerId: asPlayerId('player-1'),
        researchPoints: 20n,
        unlockedNodeIds: [],
      },
    },
    claimedRewards: [],
    processedIdempotencyKeys: [],
    version: 1,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
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

function makeMockThemeRepo(): ThemeRepository {
  const theme = makeTheme();
  return {
    findById: vi.fn((id: string) => (id === 'generic' ? theme : undefined)),
    listAll: vi.fn(() => [theme]),
  };
}

describe('unlockResearchHandler', () => {
  it('unlocks a research node and deducts research points', async () => {
    const account = makeAccount();
    const repo = makeMockRepo(account);
    const themeRepo = makeMockThemeRepo();

    const result = await unlockResearchHandler(
      { playerId: 'player-1', nodeId: 'research-1', idempotencyKey: 'idem-r1' },
      repo,
      themeRepo,
      fixedClock,
    );

    expect(result.nodeId).toBe('research-1');
    expect(result.newResearchPoints).toBe(15n); // 20 - 5
    expect(repo.save).toHaveBeenCalledOnce();

    const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as PlayerAccount;
    expect(saved.meta.research.researchPoints).toBe(15n);
    expect(saved.meta.research.unlockedNodeIds).toContain('research-1');
    expect(saved.version).toBe(2);
  });

  it('throws PlayerNotFoundError for missing player', async () => {
    const repo = makeMockRepo(null);
    const themeRepo = makeMockThemeRepo();

    await expect(
      unlockResearchHandler(
        { playerId: 'ghost', nodeId: 'research-1', idempotencyKey: 'idem-r2' },
        repo,
        themeRepo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(PlayerNotFoundError);
  });

  it('throws ResearchNodeNotFoundError for unknown node', async () => {
    const repo = makeMockRepo(makeAccount());
    const themeRepo = makeMockThemeRepo();

    await expect(
      unlockResearchHandler(
        { playerId: 'player-1', nodeId: 'unknown-node', idempotencyKey: 'idem-r3' },
        repo,
        themeRepo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(ResearchNodeNotFoundError);
  });

  it('throws ResearchNodeAlreadyUnlockedError if already unlocked', async () => {
    const account = makeAccount();
    account.meta.research.unlockedNodeIds = [asResearchNodeId('research-1')];
    const repo = makeMockRepo(account);
    const themeRepo = makeMockThemeRepo();

    await expect(
      unlockResearchHandler(
        { playerId: 'player-1', nodeId: 'research-1', idempotencyKey: 'idem-r4' },
        repo,
        themeRepo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(ResearchNodeAlreadyUnlockedError);
  });

  it('throws ResearchPrerequisitesNotMetError if prerequisites missing', async () => {
    const repo = makeMockRepo(makeAccount());
    const themeRepo = makeMockThemeRepo();

    await expect(
      unlockResearchHandler(
        { playerId: 'player-1', nodeId: 'research-2', idempotencyKey: 'idem-r5' },
        repo,
        themeRepo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(ResearchPrerequisitesNotMetError);
  });

  it('throws InsufficientResearchPointsError when points too low', async () => {
    const account = makeAccount();
    account.meta.research.researchPoints = 2n; // < 5
    const repo = makeMockRepo(account);
    const themeRepo = makeMockThemeRepo();

    await expect(
      unlockResearchHandler(
        { playerId: 'player-1', nodeId: 'research-1', idempotencyKey: 'idem-r6' },
        repo,
        themeRepo,
        fixedClock,
      ),
    ).rejects.toBeInstanceOf(InsufficientResearchPointsError);
  });

  it('is idempotent on duplicate key', async () => {
    const account = makeAccount();
    account.processedIdempotencyKeys = ['idem-dup'];
    const repo = makeMockRepo(account);
    const themeRepo = makeMockThemeRepo();

    const result = await unlockResearchHandler(
      { playerId: 'player-1', nodeId: 'research-1', idempotencyKey: 'idem-dup' },
      repo,
      themeRepo,
      fixedClock,
    );

    expect(result.newResearchPoints).toBe(20n);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('allows unlocking second node after first is unlocked', async () => {
    const account = makeAccount();
    account.meta.research.unlockedNodeIds = [asResearchNodeId('research-1')];
    account.meta.research.researchPoints = 15n;
    const repo = makeMockRepo(account);
    const themeRepo = makeMockThemeRepo();

    const result = await unlockResearchHandler(
      { playerId: 'player-1', nodeId: 'research-2', idempotencyKey: 'idem-r7' },
      repo,
      themeRepo,
      fixedClock,
    );

    expect(result.nodeId).toBe('research-2');
    expect(result.newResearchPoints).toBe(5n); // 15 - 10
    const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as PlayerAccount;
    expect(saved.meta.research.unlockedNodeIds).toContain('research-1');
    expect(saved.meta.research.unlockedNodeIds).toContain('research-2');
  });
});
