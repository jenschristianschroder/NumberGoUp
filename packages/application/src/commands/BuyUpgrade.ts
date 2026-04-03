import type { PlayerAccount } from '@numbergoUp/domain';
import {
  PlayerNotFoundError,
  UpgradeNotFoundError,
  UpgradeAlreadyPurchasedError,
  InsufficientFundsError,
  subtractCurrency,
  applyUpgradeToGenerator,
} from '@numbergoUp/domain';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { Clock } from '../ports/Clock.js';

export interface BuyUpgradeCommand {
  playerId: string;
  upgradeId: string;
  idempotencyKey: string;
}

export interface BuyUpgradeResult {
  playerId: string;
  upgradeId: string;
  newCurrency: bigint;
  version: number;
}

/**
 * Buy an upgrade for a player.
 *
 * Idempotency: if the idempotency key has already been processed, the
 * result is returned from the existing state (no mutation).
 */
export async function buyUpgradeHandler(
  command: BuyUpgradeCommand,
  repo: PlayerRepository,
  clock: Clock,
): Promise<BuyUpgradeResult> {
  const account = await repo.findById(command.playerId);
  if (!account) throw new PlayerNotFoundError(command.playerId);

  // Idempotency check
  if (account.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return {
      playerId: account.playerId,
      upgradeId: command.upgradeId,
      newCurrency: account.run.currency,
      version: account.version,
    };
  }

  const upgrade = account.run.upgrades.find((u) => u.id === command.upgradeId);
  if (!upgrade) throw new UpgradeNotFoundError(command.upgradeId);
  if (upgrade.purchased) throw new UpgradeAlreadyPurchasedError(command.upgradeId);

  if (account.run.currency < upgrade.cost) throw new InsufficientFundsError();
  const newCurrency = subtractCurrency(account.run.currency, upgrade.cost);

  // Mark upgrade as purchased
  const updatedUpgrades = account.run.upgrades.map((u) =>
    u.id === command.upgradeId ? { ...u, purchased: true } : u,
  );

  // Apply multiplier bonus to target generator if specified
  const updatedGenerators =
    upgrade.targetGeneratorId != null
      ? account.run.generators.map((g) =>
          g.id === upgrade.targetGeneratorId
            ? applyUpgradeToGenerator(g, upgrade.multiplierBonusScaled)
            : g,
        )
      : account.run.generators;

  const now = clock.now();
  const updated: PlayerAccount = {
    ...account,
    run: {
      ...account.run,
      currency: newCurrency,
      upgrades: updatedUpgrades,
      generators: updatedGenerators,
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
    upgradeId: command.upgradeId,
    newCurrency,
    version: updated.version,
  };
}
