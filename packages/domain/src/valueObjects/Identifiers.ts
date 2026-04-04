/**
 * Identifier value object – thin wrapper to ensure IDs are not
 * accidentally mixed (PlayerId vs GeneratorId, etc.).
 */
export type PlayerId = string & { readonly __brand: 'PlayerId' };
export type GeneratorId = string & { readonly __brand: 'GeneratorId' };
export type UpgradeId = string & { readonly __brand: 'UpgradeId' };
export type AutomationId = string & { readonly __brand: 'AutomationId' };
export type EventId = string & { readonly __brand: 'EventId' };
export type RewardId = string & { readonly __brand: 'RewardId' };
export type ResearchNodeId = string & { readonly __brand: 'ResearchNodeId' };

export function asPlayerId(id: string): PlayerId {
  return id as PlayerId;
}
export function asGeneratorId(id: string): GeneratorId {
  return id as GeneratorId;
}
export function asUpgradeId(id: string): UpgradeId {
  return id as UpgradeId;
}
export function asAutomationId(id: string): AutomationId {
  return id as AutomationId;
}
export function asEventId(id: string): EventId {
  return id as EventId;
}
export function asRewardId(id: string): RewardId {
  return id as RewardId;
}
export function asResearchNodeId(id: string): ResearchNodeId {
  return id as ResearchNodeId;
}
