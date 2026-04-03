import type { FastifyInstance } from 'fastify';
import {
  buyUpgradeHandler,
  claimOfflineEarningsHandler,
  prestigeResetHandler,
  assignAutomationHandler,
  claimEventRewardHandler,
  SystemClock,
} from '@numbergoUp/application';
import {
  DomainError,
} from '@numbergoUp/domain';
import type { PlayerRepository } from '@numbergoUp/application';
import type { LiveEventRepository } from '@numbergoUp/application';
import {
  BuyUpgradeSchema,
  ClaimOfflineEarningsSchema,
  PrestigeSchema,
  AssignAutomationSchema,
  ClaimRewardSchema,
  GetPlayerStateParamsSchema,
} from './schemas.js';
import { mapPlayerToDto } from './mappers.js';

export function registerRoutes(
  app: FastifyInstance,
  playerRepo: PlayerRepository,
  eventRepo: LiveEventRepository,
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
}

function errorResponse(code: string, message: string, requestId: string) {
  return { code, message, requestId };
}

// ─── Error handler helper ─────────────────────────────────────────────────────

export function handleDomainError(
  err: unknown,
  reply: import('fastify').FastifyReply,
  requestId: string,
): void {
  if (err instanceof DomainError) {
    const status = domainErrorToHttpStatus(err);
    void reply.status(status).send({ code: err.code, message: err.message, requestId });
    return;
  }
  // Re-throw unknown errors so Fastify's default error handler picks them up
  throw err;
}

function domainErrorToHttpStatus(err: DomainError): number {
  switch (err.code) {
    case 'PLAYER_NOT_FOUND':
    case 'UPGRADE_NOT_FOUND':
    case 'GENERATOR_NOT_FOUND':
    case 'EVENT_NOT_FOUND':
    case 'REWARD_NOT_FOUND':
      return 404;
    case 'UPGRADE_ALREADY_PURCHASED':
    case 'REWARD_ALREADY_CLAIMED':
    case 'DUPLICATE_COMMAND':
      return 409;
    case 'INSUFFICIENT_FUNDS':
    case 'PRESTIGE_THRESHOLD_NOT_MET':
    case 'EVENT_EXPIRED':
      return 422;
    case 'CONCURRENCY_CONFLICT':
      return 409;
    default:
      return 400;
  }
}
