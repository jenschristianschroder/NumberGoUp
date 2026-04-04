import { describe, it, expect } from 'vitest';
import {
  canUnlockResearchNode,
  unlockResearchNode,
  aggregateResearchEffects,
  researchGeneratorMultiplierBonus,
  researchPrestigeMultiplierBonus,
  researchOfflineMaxSecondsBonus,
} from '../ResearchService.js';
import { computeResearchTier } from '../models/ResearchState.js';
import type { ResearchNode } from '../models/ResearchNode.js';
import type { ResearchState } from '../models/ResearchState.js';
import { asPlayerId, asResearchNodeId } from '../valueObjects/Identifiers.js';

function makeResearchState(overrides?: Partial<ResearchState>): ResearchState {
  return {
    playerId: asPlayerId('player-1'),
    researchPoints: 100n,
    unlockedNodeIds: [],
    ...overrides,
  };
}

const nodeA: ResearchNode = {
  id: asResearchNodeId('node-a'),
  name: 'Node A',
  description: 'First node',
  cost: 10n,
  prerequisites: [],
  effects: [{ type: 'generator_multiplier', value: 200n }],
  branch: 'economy',
  isMilestone: false,
};

const nodeB: ResearchNode = {
  id: asResearchNodeId('node-b'),
  name: 'Node B',
  description: 'Requires A',
  cost: 20n,
  prerequisites: [asResearchNodeId('node-a')],
  effects: [{ type: 'generator_multiplier', value: 300n }],
  branch: 'economy',
  isMilestone: true,
};

const nodeC: ResearchNode = {
  id: asResearchNodeId('node-c'),
  name: 'Node C',
  description: 'Offline node',
  cost: 15n,
  prerequisites: [],
  effects: [{ type: 'offline_max_seconds', value: 7200n }],
  branch: 'offline',
  isMilestone: false,
};

const nodeD: ResearchNode = {
  id: asResearchNodeId('node-d'),
  name: 'Node D',
  description: 'Prestige node',
  cost: 25n,
  prerequisites: [],
  effects: [{ type: 'prestige_multiplier', value: 500n }],
  branch: 'prestige',
  isMilestone: true,
};

const allNodes = [nodeA, nodeB, nodeC, nodeD];

describe('canUnlockResearchNode', () => {
  it('returns true when player has points and no prerequisites', () => {
    const state = makeResearchState({ researchPoints: 10n });
    expect(canUnlockResearchNode(state, nodeA)).toBe(true);
  });

  it('returns false when already unlocked', () => {
    const state = makeResearchState({
      unlockedNodeIds: [asResearchNodeId('node-a')],
    });
    expect(canUnlockResearchNode(state, nodeA)).toBe(false);
  });

  it('returns false when prerequisites not met', () => {
    const state = makeResearchState({ researchPoints: 100n });
    expect(canUnlockResearchNode(state, nodeB)).toBe(false);
  });

  it('returns true when prerequisites are met', () => {
    const state = makeResearchState({
      researchPoints: 100n,
      unlockedNodeIds: [asResearchNodeId('node-a')],
    });
    expect(canUnlockResearchNode(state, nodeB)).toBe(true);
  });

  it('returns false when insufficient research points', () => {
    const state = makeResearchState({ researchPoints: 5n });
    expect(canUnlockResearchNode(state, nodeA)).toBe(false);
  });

  it('returns true when points exactly equal cost', () => {
    const state = makeResearchState({ researchPoints: 10n });
    expect(canUnlockResearchNode(state, nodeA)).toBe(true);
  });
});

describe('unlockResearchNode', () => {
  it('deducts cost and adds node to unlocked list', () => {
    const state = makeResearchState({ researchPoints: 50n });
    const newState = unlockResearchNode(state, nodeA);

    expect(newState.researchPoints).toBe(40n); // 50 - 10
    expect(newState.unlockedNodeIds).toContain(asResearchNodeId('node-a'));
  });

  it('does not mutate original state', () => {
    const state = makeResearchState({ researchPoints: 50n });
    const newState = unlockResearchNode(state, nodeA);

    expect(state.researchPoints).toBe(50n);
    expect(state.unlockedNodeIds).toHaveLength(0);
    expect(newState).not.toBe(state);
  });

  it('preserves existing unlocked nodes', () => {
    const state = makeResearchState({
      researchPoints: 50n,
      unlockedNodeIds: [asResearchNodeId('node-a')],
    });
    const newState = unlockResearchNode(state, nodeB);

    expect(newState.unlockedNodeIds).toContain(asResearchNodeId('node-a'));
    expect(newState.unlockedNodeIds).toContain(asResearchNodeId('node-b'));
    expect(newState.researchPoints).toBe(30n); // 50 - 20
  });
});

describe('aggregateResearchEffects', () => {
  it('returns empty map when no nodes are unlocked', () => {
    const effects = aggregateResearchEffects([], allNodes);
    expect(effects.size).toBe(0);
  });

  it('sums generator multiplier across unlocked nodes', () => {
    const effects = aggregateResearchEffects(
      [asResearchNodeId('node-a'), asResearchNodeId('node-b')],
      allNodes,
    );
    expect(effects.get('generator_multiplier')).toBe(500n); // 200 + 300
  });

  it('tracks different effect types separately', () => {
    const effects = aggregateResearchEffects(
      [asResearchNodeId('node-a'), asResearchNodeId('node-c'), asResearchNodeId('node-d')],
      allNodes,
    );
    expect(effects.get('generator_multiplier')).toBe(200n);
    expect(effects.get('offline_max_seconds')).toBe(7200n);
    expect(effects.get('prestige_multiplier')).toBe(500n);
  });
});

describe('convenience helpers', () => {
  it('researchGeneratorMultiplierBonus returns sum', () => {
    expect(researchGeneratorMultiplierBonus([asResearchNodeId('node-a')], allNodes)).toBe(200n);
  });

  it('researchGeneratorMultiplierBonus returns 0 for no unlocks', () => {
    expect(researchGeneratorMultiplierBonus([], allNodes)).toBe(0n);
  });

  it('researchPrestigeMultiplierBonus returns sum', () => {
    expect(researchPrestigeMultiplierBonus([asResearchNodeId('node-d')], allNodes)).toBe(500n);
  });

  it('researchOfflineMaxSecondsBonus returns number', () => {
    expect(researchOfflineMaxSecondsBonus([asResearchNodeId('node-c')], allNodes)).toBe(7200);
  });
});

describe('computeResearchTier', () => {
  const milestoneIds = [asResearchNodeId('node-b'), asResearchNodeId('node-d')];

  it('returns 0 when no milestones unlocked', () => {
    expect(computeResearchTier([], milestoneIds)).toBe(0);
  });

  it('returns 1 when one milestone is unlocked', () => {
    expect(
      computeResearchTier([asResearchNodeId('node-a'), asResearchNodeId('node-b')], milestoneIds),
    ).toBe(1);
  });

  it('returns 2 when both milestones unlocked', () => {
    expect(
      computeResearchTier(
        [asResearchNodeId('node-a'), asResearchNodeId('node-b'), asResearchNodeId('node-d')],
        milestoneIds,
      ),
    ).toBe(2);
  });

  it('ignores non-milestone nodes', () => {
    expect(
      computeResearchTier([asResearchNodeId('node-a'), asResearchNodeId('node-c')], milestoneIds),
    ).toBe(0);
  });
});
