import { z } from 'zod';

export const GetPlayerStateParamsSchema = z.object({
  playerId: z.string().min(1),
});

export const BuyUpgradeSchema = z.object({
  upgradeId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

export const ClaimOfflineEarningsSchema = z.object({
  idempotencyKey: z.string().uuid(),
});

export const PrestigeSchema = z.object({
  idempotencyKey: z.string().uuid(),
});

export const AssignAutomationSchema = z.object({
  generatorId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

export const ClaimRewardSchema = z.object({
  eventId: z.string().min(1),
  rewardId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

export const CreateAccountSchema = z.object({
  playerId: z.string().min(1),
  themeId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

export const UnlockResearchSchema = z.object({
  nodeId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});
