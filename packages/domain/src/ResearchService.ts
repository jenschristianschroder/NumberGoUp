import type { ResearchNode, ResearchEffectType } from './models/ResearchNode.js';
import type { ResearchState } from './models/ResearchState.js';
import type { ResearchNodeId } from './valueObjects/Identifiers.js';

/**
 * Check whether a player can unlock a specific research node.
 *
 * Returns `true` when:
 *  1. The node is not already unlocked.
 *  2. All prerequisite nodes are unlocked.
 *  3. The player has enough research points to pay the cost.
 */
export function canUnlockResearchNode(state: ResearchState, node: ResearchNode): boolean {
  if (state.unlockedNodeIds.includes(node.id)) return false;
  const prereqsMet = node.prerequisites.every((preId) => state.unlockedNodeIds.includes(preId));
  if (!prereqsMet) return false;
  return state.researchPoints >= node.cost;
}

/**
 * Unlock a research node, deducting the cost and recording the unlock.
 *
 * Callers must validate with `canUnlockResearchNode` first.
 * Returns a new `ResearchState` (immutable update).
 */
export function unlockResearchNode(state: ResearchState, node: ResearchNode): ResearchState {
  return {
    ...state,
    researchPoints: state.researchPoints - node.cost,
    unlockedNodeIds: [...state.unlockedNodeIds, node.id],
  };
}

/**
 * Aggregate all active research effects by type across unlocked nodes.
 *
 * Returns a map from effect type → cumulative value (bigint sum).
 */
export function aggregateResearchEffects(
  unlockedNodeIds: ResearchNodeId[],
  allNodes: ResearchNode[],
): Map<ResearchEffectType, bigint> {
  const totals = new Map<ResearchEffectType, bigint>();

  for (const node of allNodes) {
    if (!unlockedNodeIds.includes(node.id)) continue;
    for (const effect of node.effects) {
      const current = totals.get(effect.type) ?? 0n;
      totals.set(effect.type, current + effect.value);
    }
  }

  return totals;
}

/**
 * Convenience: get the total generator multiplier bonus from research (scaled ×1000).
 */
export function researchGeneratorMultiplierBonus(
  unlockedNodeIds: ResearchNodeId[],
  allNodes: ResearchNode[],
): bigint {
  return aggregateResearchEffects(unlockedNodeIds, allNodes).get('generator_multiplier') ?? 0n;
}

/**
 * Convenience: get the total prestige multiplier bonus from research (scaled ×1000).
 */
export function researchPrestigeMultiplierBonus(
  unlockedNodeIds: ResearchNodeId[],
  allNodes: ResearchNode[],
): bigint {
  return aggregateResearchEffects(unlockedNodeIds, allNodes).get('prestige_multiplier') ?? 0n;
}

/**
 * Convenience: get the total offline max seconds bonus from research.
 */
export function researchOfflineMaxSecondsBonus(
  unlockedNodeIds: ResearchNodeId[],
  allNodes: ResearchNode[],
): number {
  const bonus =
    aggregateResearchEffects(unlockedNodeIds, allNodes).get('offline_max_seconds') ?? 0n;
  return Number(bonus);
}

/** Default research points awarded per prestige reset. */
export const DEFAULT_RESEARCH_POINTS_PER_PRESTIGE = 10n;
