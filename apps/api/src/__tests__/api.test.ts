import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { ZodError } from 'zod';
import { registerRoutes } from '../routes/index.js';
import { DomainError, asPlayerId, asGeneratorId, asUpgradeId } from '@numbergoUp/domain';
import type { PlayerRepository, LiveEventRepository } from '@numbergoUp/application';
import type { PlayerAccount } from '@numbergoUp/domain';

function makeTestAccount(): PlayerAccount {
  return {
    playerId: asPlayerId('player-1'),
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
          name: 'Speed',
          description: 'Faster',
          cost: 100n,
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

async function buildTestApp(playerRepo: PlayerRepository, eventRepo: LiveEventRepository) {
  const app = Fastify({ logger: false, genReqId: () => crypto.randomUUID() });
  await app.register(sensible);

  // Fastify v5: err is unknown – use instanceof narrowing before property access.
  app.setErrorHandler(async (err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'bad request', requestId: req.id });
    }
    if (err instanceof DomainError) {
      const status = err.code === 'PLAYER_NOT_FOUND' ? 404 : 400;
      return reply.status(status).send({ code: err.code, message: err.message, requestId: req.id });
    }
    return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'error', requestId: req.id });
  });

  registerRoutes(app, playerRepo, eventRepo);
  return app;
}

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const playerRepo: PlayerRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      hasProcessedKey: vi.fn(),
    };
    const eventRepo: LiveEventRepository = {
      findById: vi.fn(),
      listActive: vi.fn(),
    };

    const app = await buildTestApp(playerRepo, eventRepo);
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
  });
});

describe('GET /players/:playerId', () => {
  it('returns player state', async () => {
    const account = makeTestAccount();
    const playerRepo: PlayerRepository = {
      findById: vi.fn(async () => account),
      save: vi.fn(),
      hasProcessedKey: vi.fn(),
    };
    const eventRepo: LiveEventRepository = {
      findById: vi.fn(),
      listActive: vi.fn(),
    };

    const app = await buildTestApp(playerRepo, eventRepo);
    const res = await app.inject({ method: 'GET', url: '/players/player-1' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.playerId).toBe('player-1');
    expect(body.data.currency).toBe('1000');
  });

  it('returns 404 for unknown player', async () => {
    const playerRepo: PlayerRepository = {
      findById: vi.fn(async () => null),
      save: vi.fn(),
      hasProcessedKey: vi.fn(),
    };
    const eventRepo: LiveEventRepository = {
      findById: vi.fn(),
      listActive: vi.fn(),
    };

    const app = await buildTestApp(playerRepo, eventRepo);
    const res = await app.inject({ method: 'GET', url: '/players/nobody' });
    expect(res.statusCode).toBe(404);
  });
});
