/**
 * Shared API contracts: request/response DTOs and command payloads.
 * All currency values are represented as integer strings (e.g. "1000")
 * to avoid floating-point precision issues.
 */

// ─── Common ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  requestId: string;
}

export interface ApiError {
  code: string;
  message: string;
  requestId: string;
}

// ─── Player state ────────────────────────────────────────────────────────────

export interface GeneratorDto {
  id: string;
  name: string;
  level: number;
  baseOutput: string; // integer string
  multiplier: string; // integer string, scaled by 1000 (e.g. "1500" = 1.5×)
}

export interface UpgradeDto {
  id: string;
  name: string;
  purchased: boolean;
  cost: string; // integer string
}

export interface AutomationDto {
  id: string;
  generatorId: string;
  active: boolean;
}

export interface MetaProgressionDto {
  prestigeCount: number;
  permanentMultiplier: string; // scaled ×1000
  totalLifetimeEarnings: string; // integer string
  research: ResearchStateDto;
}

export interface ResearchStateDto {
  researchPoints: string; // integer string
  unlockedNodeIds: string[];
  researchTier: number;
}

export interface ResearchNodeDto {
  id: string;
  name: string;
  description: string;
  cost: string; // integer string
  prerequisites: string[];
  effects: ResearchEffectDto[];
  branch: string;
  isMilestone: boolean;
  /** Present when returning a player's research tree (indicates unlock status). */
  unlocked?: boolean;
}

export interface ResearchEffectDto {
  type: string;
  value: string; // integer string
}

export interface PlayerStateDto {
  playerId: string;
  currency: string; // integer string
  generators: GeneratorDto[];
  upgrades: UpgradeDto[];
  automations: AutomationDto[];
  meta: MetaProgressionDto;
  lastTickAt: string; // ISO-8601 UTC
  version: number; // optimistic concurrency token
}

// ─── Commands ────────────────────────────────────────────────────────────────

export interface BuyUpgradeRequest {
  upgradeId: string;
  idempotencyKey: string;
}

export interface ClaimOfflineEarningsRequest {
  idempotencyKey: string;
}

export interface PrestigeRequest {
  idempotencyKey: string;
}

export interface AssignAutomationRequest {
  generatorId: string;
  idempotencyKey: string;
}

export interface ClaimRewardRequest {
  eventId: string;
  rewardId: string;
  idempotencyKey: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface BuyUpgradeResponse {
  playerId: string;
  upgradeId: string;
  newCurrency: string;
  version: number;
}

export interface ClaimOfflineEarningsResponse {
  playerId: string;
  earned: string; // integer string
  newCurrency: string;
  secondsElapsed: number;
  version: number;
}

export interface PrestigeResponse {
  playerId: string;
  prestigeCount: number;
  newMultiplier: string;
  researchPointsAwarded: string; // integer string
  version: number;
}

export interface UnlockResearchRequest {
  nodeId: string;
  idempotencyKey: string;
}

export interface UnlockResearchResponse {
  playerId: string;
  nodeId: string;
  newResearchPoints: string; // integer string
  version: number;
}

export interface ClaimRewardResponse {
  playerId: string;
  rewardId: string;
  granted: string; // integer string
  version: number;
}

// ─── Create account ──────────────────────────────────────────────────────────

export interface CreateAccountRequest {
  playerId: string;
  themeId: string;
  idempotencyKey: string;
}

export interface CreateAccountResponse {
  playerId: string;
  themeId: string;
  version: number;
}

// ─── Themes ──────────────────────────────────────────────────────────────────

export interface GeneratorTemplateDto {
  id: string;
  name: string;
  baseOutput: string; // integer string
  multiplier: string; // integer string, scaled ×1000
}

export interface UpgradeTemplateDto {
  id: string;
  name: string;
  description: string;
  cost: string; // integer string
  targetGeneratorId?: string;
  multiplierBonusScaled: string; // integer string, scaled ×1000
}

export interface ThemeDto {
  id: string;
  name: string;
  description: string;
  generators: GeneratorTemplateDto[];
  upgrades: UpgradeTemplateDto[];
  initialCurrency: string; // integer string
  prestigeThreshold: string; // integer string
  maxOfflineSeconds: number;
  researchNodes: ResearchNodeDto[];
  researchPointsPerPrestige: string; // integer string
}

export interface ThemeSummaryDto {
  id: string;
  name: string;
  description: string;
}

// ─── Service Bus messages ─────────────────────────────────────────────────────

export type MessageType =
  | 'buy-upgrade'
  | 'claim-offline-earnings'
  | 'prestige-reset'
  | 'assign-automation'
  | 'claim-event-reward'
  | 'create-account'
  | 'unlock-research';

export interface ServiceBusMessage<T = unknown> {
  type: MessageType;
  playerId: string;
  idempotencyKey: string;
  payload: T;
  enqueuedAt: string; // ISO-8601 UTC
}
