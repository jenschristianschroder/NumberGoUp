import type { PlayerAccount, ResearchNode } from '@numbergoUp/domain';
import {
  PlayerNotFoundError,
  ResearchNodeNotFoundError,
  ResearchNodeAlreadyUnlockedError,
  ResearchPrerequisitesNotMetError,
  InsufficientResearchPointsError,
  unlockResearchNode,
} from '@numbergoUp/domain';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { ThemeRepository } from '../ports/ThemeRepository.js';
import type { Clock } from '../ports/Clock.js';

export interface UnlockResearchCommand {
  playerId: string;
  nodeId: string;
  idempotencyKey: string;
}

export interface UnlockResearchResult {
  playerId: string;
  nodeId: string;
  newResearchPoints: bigint;
  version: number;
}

/**
 * Unlock a research node for a player by spending research points.
 *
 * Idempotency: if the idempotency key has already been processed, the
 * result is returned from the existing state (no mutation).
 */
export async function unlockResearchHandler(
  command: UnlockResearchCommand,
  repo: PlayerRepository,
  themeRepo: ThemeRepository,
  clock: Clock,
): Promise<UnlockResearchResult> {
  const now = clock.now();
  const account = await repo.findById(command.playerId);
  if (!account) throw new PlayerNotFoundError(command.playerId);

  // Idempotency check
  if (account.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return {
      playerId: account.playerId,
      nodeId: command.nodeId,
      newResearchPoints: account.meta.research.researchPoints,
      version: account.version,
    };
  }

  // Resolve the research node from the player's theme
  const theme = themeRepo.findById(account.themeId);
  const nodeTemplate = theme?.researchNodes.find((n) => n.id === command.nodeId);
  if (!nodeTemplate) throw new ResearchNodeNotFoundError(command.nodeId);

  // Build the full ResearchNode from the template
  const node: ResearchNode = {
    id: nodeTemplate.id,
    name: nodeTemplate.name,
    description: nodeTemplate.description,
    cost: nodeTemplate.cost,
    prerequisites: nodeTemplate.prerequisites,
    effects: nodeTemplate.effects,
    branch: nodeTemplate.branch,
    isMilestone: nodeTemplate.isMilestone,
  };

  // Validate preconditions
  const research = account.meta.research;
  if (research.unlockedNodeIds.includes(node.id)) {
    throw new ResearchNodeAlreadyUnlockedError(command.nodeId);
  }
  const prereqsMet = node.prerequisites.every((preId) => research.unlockedNodeIds.includes(preId));
  if (!prereqsMet) {
    throw new ResearchPrerequisitesNotMetError(command.nodeId);
  }
  if (research.researchPoints < node.cost) {
    throw new InsufficientResearchPointsError();
  }

  // Unlock the node
  const newResearch = unlockResearchNode(research, node);

  const updated: PlayerAccount = {
    ...account,
    meta: {
      ...account.meta,
      research: newResearch,
    },
    processedIdempotencyKeys: [
      ...account.processedIdempotencyKeys.slice(-99),
      command.idempotencyKey,
    ],
    version: account.version + 1,
    updatedAt: now,
  };

  await repo.save(updated);

  return {
    playerId: account.playerId,
    nodeId: command.nodeId,
    newResearchPoints: newResearch.researchPoints,
    version: updated.version,
  };
}
