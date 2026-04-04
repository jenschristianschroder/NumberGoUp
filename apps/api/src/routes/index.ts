import type { FastifyInstance } from 'fastify';
import {
  buyUpgradeHandler,
  claimOfflineEarningsHandler,
  prestigeResetHandler,
  assignAutomationHandler,
  claimEventRewardHandler,
  createAccountHandler,
  SystemClock,
} from '@numbergoUp/application';
import type { PlayerRepository } from '@numbergoUp/application';
import type { LiveEventRepository } from '@numbergoUp/application';
import type { ThemeRepository } from '@numbergoUp/application';
import {
  BuyUpgradeSchema,
  ClaimOfflineEarningsSchema,
  PrestigeSchema,
  AssignAutomationSchema,
  ClaimRewardSchema,
  CreateAccountSchema,
  GetPlayerStateParamsSchema,
} from './schemas.js';
import { mapPlayerToDto, mapThemeToDto, mapThemeToSummaryDto } from './mappers.js';

export function registerRoutes(
  app: FastifyInstance,
  playerRepo: PlayerRepository,
  eventRepo: LiveEventRepository,
  themeRepo: ThemeRepository,
): void {
  // ─── Health ────────────────────────────────────────────────────────────────
  app.get('/health', async (_req, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── Get player state ──────────────────────────────────────────────────────
  app.get<{ Params: { playerId: string } }>('/players/:playerId', async (req, reply) => {
    const { playerId } = GetPlayerStateParamsSchema.parse(req.params);
    const account = await playerRepo.findById(playerId);
    if (!account) {
      return reply.status(404).send(errorResponse('PLAYER_NOT_FOUND', 'Player not found', req.id));
    }
    return reply.send({ data: mapPlayerToDto(account), requestId: req.id });
  });

  // ─── Buy upgrade ───────────────────────────────────────────────────────────
  app.post<{ Params: { playerId: string }; Body: unknown }>(
    '/players/:playerId/upgrades/buy',
    async (req, reply) => {
      const { playerId } = GetPlayerStateParamsSchema.parse(req.params);
      const body = BuyUpgradeSchema.parse(req.body);

      const result = await buyUpgradeHandler(
        { playerId, upgradeId: body.upgradeId, idempotencyKey: body.idempotencyKey },
        playerRepo,
        SystemClock,
      );

      return reply.status(200).send({
        data: {
          playerId: result.playerId,
          upgradeId: result.upgradeId,
          newCurrency: result.newCurrency.toString(),
          version: result.version,
        },
        requestId: req.id,
      });
    },
  );

  // ─── Claim offline earnings ────────────────────────────────────────────────
  app.post<{ Params: { playerId: string }; Body: unknown }>(
    '/players/:playerId/offline-earnings/claim',
    async (req, reply) => {
      const { playerId } = GetPlayerStateParamsSchema.parse(req.params);
      const body = ClaimOfflineEarningsSchema.parse(req.body);

      const result = await claimOfflineEarningsHandler(
        { playerId, idempotencyKey: body.idempotencyKey },
        playerRepo,
        SystemClock,
      );

      return reply.status(200).send({
        data: {
          playerId: result.playerId,
          earned: result.earned.toString(),
          newCurrency: result.newCurrency.toString(),
          secondsElapsed: result.secondsElapsed,
          version: result.version,
        },
        requestId: req.id,
      });
    },
  );

  // ─── Prestige ──────────────────────────────────────────────────────────────
  app.post<{ Params: { playerId: string }; Body: unknown }>(
    '/players/:playerId/prestige',
    async (req, reply) => {
      const { playerId } = GetPlayerStateParamsSchema.parse(req.params);
      const body = PrestigeSchema.parse(req.body);

      const result = await prestigeResetHandler(
        { playerId, idempotencyKey: body.idempotencyKey },
        playerRepo,
        SystemClock,
      );

      return reply.status(200).send({
        data: {
          playerId: result.playerId,
          prestigeCount: result.prestigeCount,
          newMultiplier: result.newMultiplier.toString(),
          version: result.version,
        },
        requestId: req.id,
      });
    },
  );

  // ─── Assign automation ─────────────────────────────────────────────────────
  app.post<{ Params: { playerId: string }; Body: unknown }>(
    '/players/:playerId/automations/assign',
    async (req, reply) => {
      const { playerId } = GetPlayerStateParamsSchema.parse(req.params);
      const body = AssignAutomationSchema.parse(req.body);

      const result = await assignAutomationHandler(
        { playerId, generatorId: body.generatorId, idempotencyKey: body.idempotencyKey },
        playerRepo,
        SystemClock,
      );

      return reply.status(200).send({
        data: result,
        requestId: req.id,
      });
    },
  );

  // ─── Claim event reward ────────────────────────────────────────────────────
  app.post<{ Params: { playerId: string }; Body: unknown }>(
    '/players/:playerId/rewards/claim',
    async (req, reply) => {
      const { playerId } = GetPlayerStateParamsSchema.parse(req.params);
      const body = ClaimRewardSchema.parse(req.body);

      const result = await claimEventRewardHandler(
        {
          playerId,
          eventId: body.eventId,
          rewardId: body.rewardId,
          idempotencyKey: body.idempotencyKey,
        },
        playerRepo,
        eventRepo,
        SystemClock,
      );

      return reply.status(200).send({
        data: {
          playerId: result.playerId,
          rewardId: result.rewardId,
          granted: result.granted.toString(),
          version: result.version,
        },
        requestId: req.id,
      });
    },
  );

  // ─── Create account ──────────────────────────────────────────────────────
  app.post<{ Body: unknown }>('/players', async (req, reply) => {
    const body = CreateAccountSchema.parse(req.body);

    const result = await createAccountHandler(
      {
        playerId: body.playerId,
        themeId: body.themeId,
        idempotencyKey: body.idempotencyKey,
      },
      playerRepo,
      themeRepo,
      SystemClock,
    );

    const account = await playerRepo.findById(result.playerId);
    if (!account) {
      return reply
        .status(500)
        .send(errorResponse('INTERNAL_ERROR', 'Failed to load created account', req.id));
    }

    return reply.status(201).send({
      data: mapPlayerToDto(account),
      requestId: req.id,
    });
  });

  // ─── List themes ────────────────────────────────────────────────────────────
  app.get('/themes', async (_req, reply) => {
    const themes = themeRepo.listAll();
    return reply.send({
      data: themes.map(mapThemeToSummaryDto),
      requestId: _req.id,
    });
  });

  // ─── Get theme by ID ───────────────────────────────────────────────────────
  app.get<{ Params: { themeId: string } }>('/themes/:themeId', async (req, reply) => {
    const theme = themeRepo.findById(req.params.themeId);
    if (!theme) {
      return reply.status(404).send(errorResponse('THEME_NOT_FOUND', 'Theme not found', req.id));
    }
    return reply.send({
      data: mapThemeToDto(theme),
      requestId: req.id,
    });
  });
}

function errorResponse(code: string, message: string, requestId: string) {
  return { code, message, requestId };
}
