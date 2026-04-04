import type { PlayerAccount } from '@numbergoUp/domain';
import {
  PlayerNotFoundError,
  PrestigeThresholdNotMetError,
  canPrestige,
  computePrestigeBonus,
  PRESTIGE_MINIMUM_LIFETIME_EARNINGS,
  DEFAULT_RESEARCH_POINTS_PER_PRESTIGE,
} from '@numbergoUp/domain';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { ThemeRepository } from '../ports/ThemeRepository.js';
import type { Clock } from '../ports/Clock.js';

export interface PrestigeResetCommand {
  playerId: string;
  idempotencyKey: string;
}

export interface PrestigeResetResult {
  playerId: string;
  prestigeCount: number;
  newMultiplier: bigint;
  researchPointsAwarded: bigint;
  version: number;
}

/**
 * Reset the player's run in exchange for a permanent prestige multiplier bonus.
 *
 * Resets: currency, generators (back to level 1), upgrades (un-purchased).
 * Preserves: meta progression, total lifetime earnings, research state.
 * Awards: research points defined by the player's theme.
 */
export async function prestigeResetHandler(
  command: PrestigeResetCommand,
  repo: PlayerRepository,
  clock: Clock,
  themeRepo: ThemeRepository,
): Promise<PrestigeResetResult> {
  const now = clock.now();
  const account = await repo.findById(command.playerId);
  if (!account) throw new PlayerNotFoundError(command.playerId);

  if (account.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return {
      playerId: account.playerId,
      prestigeCount: account.meta.prestigeCount,
      newMultiplier: account.meta.permanentMultiplierScaled,
      researchPointsAwarded: 0n,
      version: account.version,
    };
  }

  if (!canPrestige(account)) {
    throw new PrestigeThresholdNotMetError(PRESTIGE_MINIMUM_LIFETIME_EARNINGS.toString());
  }

  // Determine research points per prestige from theme, fallback to default
  let researchPointsAwarded = DEFAULT_RESEARCH_POINTS_PER_PRESTIGE;
  const theme = themeRepo.findById(account.themeId);
  if (theme) {
    researchPointsAwarded = theme.researchPointsPerPrestige;
  }

  const newMeta = computePrestigeBonus(account.meta, researchPointsAwarded);

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
    researchPointsAwarded,
    version: updated.version,
  };
}
