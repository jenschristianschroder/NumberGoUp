import type { PlayerAccount } from '@numbergoUp/domain';
import type { PlayerStateDto } from '@numbergoUp/contracts';

export function mapPlayerToDto(account: PlayerAccount): PlayerStateDto {
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
    },
    lastTickAt: account.run.lastTickAt.toISOString(),
    version: account.version,
  };
}
