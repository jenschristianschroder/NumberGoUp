import type { PlayerAccount, GameTheme } from '@numbergoUp/domain';
import type { PlayerStateDto, ThemeDto, ThemeSummaryDto, ResearchNodeDto } from '@numbergoUp/contracts';

export function mapPlayerToDto(account: PlayerAccount): PlayerStateDto {
  const milestoneNodeIds = new Set<string>(); // filled lazily by theme if needed
  return {
    playerId: account.playerId,
    currency: account.run.currency.toString(),
    generators: account.run.generators.map((g) => ({
      id: g.id,
      name: g.name,
      level: g.level,
      baseOutput: g.baseOutput.toString(),
      multiplier: g.multiplierScaled.toString(),
    })),
    upgrades: account.run.upgrades.map((u) => ({
      id: u.id,
      name: u.name,
      purchased: u.purchased,
      cost: u.cost.toString(),
    })),
    automations: account.run.automations.map((a) => ({
      id: a.id,
      generatorId: a.generatorId,
      active: a.active,
    })),
    meta: {
      prestigeCount: account.meta.prestigeCount,
      permanentMultiplier: account.meta.permanentMultiplierScaled.toString(),
      totalLifetimeEarnings: account.meta.totalLifetimeEarnings.toString(),
      research: {
        researchPoints: account.meta.research.researchPoints.toString(),
        unlockedNodeIds: account.meta.research.unlockedNodeIds.map((id) => id.toString()),
        researchTier: 0, // requires theme context; set below if needed
      },
    },
    lastTickAt: account.run.lastTickAt.toISOString(),
    version: account.version,
  };
}

/**
 * Map a player to DTO with theme context so research tier can be computed.
 */
export function mapPlayerToDtoWithTheme(
  account: PlayerAccount,
  theme: GameTheme | undefined,
): PlayerStateDto {
  const dto = mapPlayerToDto(account);
  if (theme) {
    const milestoneNodeIds = theme.researchNodes
      .filter((n) => n.isMilestone)
      .map((n) => n.id as string);
    const unlockedMilestones = account.meta.research.unlockedNodeIds.filter((id) =>
      milestoneNodeIds.includes(id as string),
    );
    dto.meta.research.researchTier = unlockedMilestones.length;
  }
  return dto;
}

function mapResearchNodeToDto(
  node: GameTheme['researchNodes'][number],
): ResearchNodeDto {
  return {
    id: node.id,
    name: node.name,
    description: node.description,
    cost: node.cost.toString(),
    prerequisites: node.prerequisites.map((p) => p.toString()),
    effects: node.effects.map((e) => ({
      type: e.type,
      value: e.value.toString(),
    })),
    branch: node.branch,
    isMilestone: node.isMilestone,
  };
}

export function mapThemeToDto(theme: GameTheme): ThemeDto {
  return {
    id: theme.id,
    name: theme.name,
    description: theme.description,
    generators: theme.generators.map((g) => ({
      id: g.id,
      name: g.name,
      baseOutput: g.baseOutput.toString(),
      multiplier: g.multiplierScaled.toString(),
    })),
    upgrades: theme.upgrades.map((u) => ({
      id: u.id,
      name: u.name,
      description: u.description,
      cost: u.cost.toString(),
      targetGeneratorId: u.targetGeneratorId,
      multiplierBonusScaled: u.multiplierBonusScaled.toString(),
    })),
    initialCurrency: theme.initialCurrency.toString(),
    prestigeThreshold: theme.prestigeThreshold.toString(),
    maxOfflineSeconds: theme.maxOfflineSeconds,
    researchNodes: theme.researchNodes.map(mapResearchNodeToDto),
    researchPointsPerPrestige: theme.researchPointsPerPrestige.toString(),
  };
}

export function mapThemeToSummaryDto(theme: GameTheme): ThemeSummaryDto {
  return {
    id: theme.id,
    name: theme.name,
    description: theme.description,
  };
}
