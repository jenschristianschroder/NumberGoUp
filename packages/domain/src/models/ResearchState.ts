import type { ResearchNodeId, PlayerId } from '../valueObjects/Identifiers.js';
import type { Currency } from '../valueObjects/Currency.js';

/**
 * ResearchState – permanent research progression that survives prestige resets.
 *
 * Stored alongside MetaProgression as part of the player's permanent state.
 */
export interface ResearchState {
  playerId: PlayerId;
  /** Spendable research points balance. */
  researchPoints: Currency;
  /** IDs of research nodes the player has unlocked. */
  unlockedNodeIds: ResearchNodeId[];
}

/**
 * Compute the Research Tier from the number of unlocked milestone nodes.
 * Tier = count of unlocked milestone nodes.
 */
export function computeResearchTier(
  unlockedNodeIds: ResearchNodeId[],
  milestoneNodeIds: ResearchNodeId[],
): number {
  return unlockedNodeIds.filter((id) => milestoneNodeIds.includes(id)).length;
}
