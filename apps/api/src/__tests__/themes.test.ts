import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { ZodError } from 'zod';
import { registerRoutes } from '../routes/index.js';
import { DomainError, asPlayerId, asGeneratorId, asUpgradeId } from '@numbergoUp/domain';
import type { PlayerRepository, LiveEventRepository, ThemeRepository } from '@numbergoUp/application';
import type { PlayerAccount, GameTheme } from '@numbergoUp/domain';

function makeTestTheme(): GameTheme {
  return {
    id: 'generic',
    name: 'Generic',
    description: 'Test theme',
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
  };
}

function makeTestAccount(): PlayerAccount {
  return {
    playerId: asPlayerId('player-1'),
    run: {
      currency: 200n,
      generators: [
        {
          id: asGeneratorId('gen-1'),
          name: 'Gen 1',
          level: 1,
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
          purchased: false,
          targetGeneratorId: asGeneratorId('gen-1'),
          multiplierBonusScaled: 500n,
        },
      ],
      automations: [],
      activeBoosts: [],
      lastTickAt: new Date('2024-06-01T12:00:00Z'),
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
    createdAt: new Date('2024-06-01T12:00:00Z'),
    updatedAt: new Date('2024-06-01T12:00:00Z'),
  };
}

async function buildTestApp(
  playerRepo: PlayerRepository,
  eventRepo: LiveEventRepository,
  themeRepo: ThemeRepository,
) {
  const app = Fastify({ logger: false, genReqId: () => crypto.randomUUID() });
  await app.register(sensible);

  app.setErrorHandler(async (err, req, reply) => {
    if (err instanceof ZodError) {
      return reply
        .status(400)
        .send({ code: 'VALIDATION_ERROR', message: 'bad request', requestId: req.id });
    }
    if (err instanceof DomainError) {
      const statusMap: Record<string, number> = {
        PLAYER_NOT_FOUND: 404,
        THEME_NOT_FOUND: 404,
        PLAYER_ALREADY_EXISTS: 409,
      };
      const status = statusMap[err.code] ?? 400;
      return reply.status(status).send({ code: err.code, message: err.message, requestId: req.id });
    }
    return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'error', requestId: req.id });
  });

  registerRoutes(app, playerRepo, eventRepo, themeRepo);
  return app;
}

function makeRepos() {
  const theme = makeTestTheme();
  const playerRepo: PlayerRepository = {
    findById: vi.fn(async () => null),
    save: vi.fn(),
    hasProcessedKey: vi.fn(async () => false),
  };
  const eventRepo: LiveEventRepository = {
    findById: vi.fn(),
    listActive: vi.fn(),
  };
  const themeRepo: ThemeRepository = {
    findById: vi.fn((id: string) => (id === 'generic' ? theme : undefined)),
    listAll: vi.fn(() => [theme]),
  };
  return { playerRepo, eventRepo, themeRepo };
}

describe('POST /players (create account)', () => {
  it('creates a new account and returns 201 with player state', async () => {
    const { playerRepo, eventRepo, themeRepo } = makeRepos();
    const createdAccount = makeTestAccount();

    // findById: first call returns null (doesn't exist), second call returns the created account
    let callCount = 0;
    (playerRepo.findById as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? null : createdAccount;
    });

    const app = await buildTestApp(playerRepo, eventRepo, themeRepo);
    const res = await app.inject({
      method: 'POST',
      url: '/players',
      payload: {
        playerId: 'player-1',
        themeId: 'generic',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.playerId).toBe('player-1');
    expect(body.data.currency).toBe('200');
    expect(body.data.generators).toHaveLength(1);
    expect(body.data.upgrades).toHaveLength(1);
  });

  it('returns 400 for missing fields', async () => {
    const { playerRepo, eventRepo, themeRepo } = makeRepos();
    const app = await buildTestApp(playerRepo, eventRepo, themeRepo);

    const res = await app.inject({
      method: 'POST',
      url: '/players',
      payload: { playerId: 'player-1' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for unknown theme', async () => {
    const { playerRepo, eventRepo, themeRepo } = makeRepos();
    const app = await buildTestApp(playerRepo, eventRepo, themeRepo);

    const res = await app.inject({
      method: 'POST',
      url: '/players',
      payload: {
        playerId: 'player-1',
        themeId: 'nonexistent',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
      },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /themes', () => {
  it('returns list of available themes', async () => {
    const { playerRepo, eventRepo, themeRepo } = makeRepos();
    const app = await buildTestApp(playerRepo, eventRepo, themeRepo);

    const res = await app.inject({ method: 'GET', url: '/themes' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('generic');
    expect(body.data[0].name).toBe('Generic');
    expect(body.data[0].description).toBe('Test theme');
  });
});

describe('GET /themes/:themeId', () => {
  it('returns theme details', async () => {
    const { playerRepo, eventRepo, themeRepo } = makeRepos();
    const app = await buildTestApp(playerRepo, eventRepo, themeRepo);

    const res = await app.inject({ method: 'GET', url: '/themes/generic' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data.id).toBe('generic');
    expect(body.data.generators).toHaveLength(1);
    expect(body.data.upgrades).toHaveLength(1);
    expect(body.data.initialCurrency).toBe('200');
    expect(body.data.prestigeThreshold).toBe('1000000');
    expect(body.data.maxOfflineSeconds).toBe(28800);
  });

  it('returns 404 for unknown theme', async () => {
    const { playerRepo, eventRepo, themeRepo } = makeRepos();
    const app = await buildTestApp(playerRepo, eventRepo, themeRepo);

    const res = await app.inject({ method: 'GET', url: '/themes/nonexistent' });
    expect(res.statusCode).toBe(404);
  });
});
