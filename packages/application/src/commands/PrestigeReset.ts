import type { PlayerAccount } from '@numbergoUp/domain';
import {
  PlayerNotFoundError,
  PrestigeThresholdNotMetError,
  canPrestige,
  computePrestigeBonus,
  PRESTIGE_MINIMUM_LIFETIME_EARNINGS,
} from '@numbergoUp/domain';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { Clock } from '../ports/Clock.js';

export interface PrestigeResetCommand {
  playerId: string;
  idempotencyKey: string;
}

export interface PrestigeResetResult {
  playerId: string;
  prestigeCount: number;
  newMultiplier: bigint;
  version: number;
}

/**
 * Reset the player's run in exchange for a permanent prestige multiplier bonus.
 *
 * Resets: currency, generators (back to level 1), upgrades (un-purchased).
 * Preserves: meta progression, total lifetime earnings.
 */
export async function prestigeResetHandler(
  command: PrestigeResetCommand,
  repo: PlayerRepository,
  clock: Clock,
): Promise<PrestigeResetResult> {
  const now = clock.now();
  const account = await repo.findById(command.playerId);
  if (!account) throw new PlayerNotFoundError(command.playerId);

  if (account.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return {
      playerId: account.playerId,
      prestigeCount: account.meta.prestigeCount,
      newMultiplier: account.meta.permanentMultiplierScaled,
      version: account.version,
    };
  }

  if (!canPrestige(account)) {
    throw new PrestigeThresholdNotMetError(PRESTIGE_MINIMUM_LIFETIME_EARNINGS.toString());
  }

  const newMeta = computePrestigeBonus(account.meta);

  // Reset run: currency to 0, upgrades un-purchased, generators back to base
  const resetGenerators = account.run.generators.map((g) => ({
    ...g,
    level: 1,
    multiplierScaled: 1000n,
  }));
  const resetUpgrades = account.run.upgrades.map((u) => ({ ...u, purchased: false }));

  const updated: PlayerAccount = {
    ...account,
    run: {
      ...account.run,
      currency: 0n,
      generators: resetGenerators,
      upgrades: resetUpgrades,
      activeBoosts: [],
      lastTickAt: now,
    },
    meta: newMeta,
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
    prestigeCount: newMeta.prestigeCount,
    newMultiplier: newMeta.permanentMultiplierScaled,
    version: updated.version,
  };
}
