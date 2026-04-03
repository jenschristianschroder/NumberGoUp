import type { PlayerAccount } from '@numbergoUp/domain';
import {
  PlayerNotFoundError,
  addCurrency,
  computeOfflineEarnings,
  applyMetaMultiplier,
} from '@numbergoUp/domain';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { Clock } from '../ports/Clock.js';

export interface ClaimOfflineEarningsCommand {
  playerId: string;
  idempotencyKey: string;
}

export interface ClaimOfflineEarningsResult {
  playerId: string;
  earned: bigint;
  newCurrency: bigint;
  secondsElapsed: number;
  version: number;
}

/**
 * Claim offline earnings for a player.
 *
 * Server is authoritative: elapsed time is computed from lastTickAt, never
 * from client-supplied timestamps.
 */
export async function claimOfflineEarningsHandler(
  command: ClaimOfflineEarningsCommand,
  repo: PlayerRepository,
  clock: Clock,
): Promise<ClaimOfflineEarningsResult> {
  const now = clock.now();
  const account = await repo.findById(command.playerId);
  if (!account) throw new PlayerNotFoundError(command.playerId);

  // Idempotency: if already processed, return current state
  if (account.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return {
      playerId: account.playerId,
      earned: 0n,
      newCurrency: account.run.currency,
      secondsElapsed: 0,
      version: account.version,
    };
  }

  const { earned: rawEarned, secondsElapsed } = computeOfflineEarnings(account.run, now);
  const earned = applyMetaMultiplier(rawEarned, account.meta.permanentMultiplierScaled);

  const newCurrency = addCurrency(account.run.currency, earned);
  const newLifetime = addCurrency(account.meta.totalLifetimeEarnings, earned);

  const updated: PlayerAccount = {
    ...account,
    run: {
      ...account.run,
      currency: newCurrency,
      lastTickAt: now,
    },
    meta: {
      ...account.meta,
      totalLifetimeEarnings: newLifetime,
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
    earned,
    newCurrency,
    secondsElapsed,
    version: updated.version,
  };
}
