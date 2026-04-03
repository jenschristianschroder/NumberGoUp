import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { ZodError } from 'zod';
import { DomainError } from '@numbergoUp/domain';
import { registerRoutes } from './routes/index.js';
import { createRepositories } from './config/repositories.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(sensible);

  // ─── Global error handler ─────────────────────────────────────────────────
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors,
        requestId: req.id,
      });
    }
    if (err instanceof DomainError) {
      const status = domainErrorToStatus(err.code);
      return reply.status(status).send({
        code: err.code,
        message: err.message,
        requestId: req.id,
      });
    }
    req.log.error(err);
    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: req.id,
    });
  });

  const { playerRepo, eventRepo } = createRepositories();
  registerRoutes(app, playerRepo, eventRepo);

  return app;
}

function domainErrorToStatus(code: string): number {
  switch (code) {
    case 'PLAYER_NOT_FOUND':
    case 'UPGRADE_NOT_FOUND':
    case 'GENERATOR_NOT_FOUND':
    case 'EVENT_NOT_FOUND':
    case 'REWARD_NOT_FOUND':
      return 404;
    case 'UPGRADE_ALREADY_PURCHASED':
    case 'REWARD_ALREADY_CLAIMED':
    case 'DUPLICATE_COMMAND':
    case 'CONCURRENCY_CONFLICT':
      return 409;
    case 'INSUFFICIENT_FUNDS':
    case 'PRESTIGE_THRESHOLD_NOT_MET':
    case 'EVENT_EXPIRED':
      return 422;
    default:
      return 400;
  }
}
