import type { ResearchNodeId } from '../valueObjects/Identifiers.js';
import type { Currency } from '../valueObjects/Currency.js';

/**
 * ResearchEffectType – the kind of bonus a research node grants when unlocked.
 *
 * - `generator_multiplier`:  additive bonus to ALL generators (scaled ×1000)
 * - `prestige_multiplier`:   additive bonus to prestige reward (scaled ×1000)
 * - `offline_max_seconds`:   adds seconds to the offline earnings cap
 * - `automation_slots`:      increases the number of automation slots available
 * - `boost_effectiveness`:   additive bonus to timed-boost multipliers (scaled ×1000)
 */
export type ResearchEffectType =
  | 'generator_multiplier'
  | 'prestige_multiplier'
  | 'offline_max_seconds'
  | 'automation_slots'
  | 'boost_effectiveness';

/**
 * ResearchEffect – a single bonus granted by unlocking a research node.
 */
export interface ResearchEffect {
  type: ResearchEffectType;
  /** Numeric value of the effect. Interpretation depends on `type`. */
  value: bigint;
}

/**
 * ResearchNode – a node in the research tree.
 *
 * Nodes have a cost in research points, prerequisites that must be unlocked
 * first, and one or more effects granted when unlocked.
 *
 * `isMilestone` flags nodes that define a progression beat (Research Tier).
 */
export interface ResearchNode {
  id: ResearchNodeId;
  name: string;
  description: string;
  /** Cost in research points to unlock. */
  cost: Currency;
  /** IDs of prerequisite research nodes that must be unlocked first. */
  prerequisites: ResearchNodeId[];
  /** Effects granted when this node is unlocked. */
  effects: ResearchEffect[];
  /** Branch label for UI grouping (e.g. 'economy', 'automation'). */
  branch: string;
  /** Whether this node is a milestone that contributes to the Research Tier. */
  isMilestone: boolean;
}
