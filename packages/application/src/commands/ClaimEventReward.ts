import type { PlayerAccount } from '@numbergoUp/domain';
import {
  PlayerNotFoundError,
  EventNotFoundError,
  EventExpiredError,
  RewardNotFoundError,
  RewardAlreadyClaimedError,
  addCurrency,
  isEventActive,
} from '@numbergoUp/domain';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { LiveEventRepository } from '../ports/LiveEventRepository.js';
import type { Clock } from '../ports/Clock.js';

export interface ClaimEventRewardCommand {
  playerId: string;
  eventId: string;
  rewardId: string;
  idempotencyKey: string;
}

export interface ClaimEventRewardResult {
  playerId: string;
  rewardId: string;
  granted: bigint;
  version: number;
}

/**
 * Claim a reward from a live event.
 *
 * Server validates that:
 *  - the event exists and is currently active
 *  - the reward exists within the event
 *  - the player has not already claimed this reward
 */
export async function claimEventRewardHandler(
  command: ClaimEventRewardCommand,
  playerRepo: PlayerRepository,
  eventRepo: LiveEventRepository,
  clock: Clock,
): Promise<ClaimEventRewardResult> {
  const now = clock.now();
  const account = await playerRepo.findById(command.playerId);
  if (!account) throw new PlayerNotFoundError(command.playerId);

  if (account.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    return {
      playerId: account.playerId,
      rewardId: command.rewardId,
      granted: 0n,
      version: account.version,
    };
  }

  const event = await eventRepo.findById(command.eventId);
  if (!event) throw new EventNotFoundError(command.eventId);
  if (!isEventActive(event, now)) throw new EventExpiredError(command.eventId);

  const reward = event.rewards.find((r) => r.id === command.rewardId);
  if (!reward) throw new RewardNotFoundError(command.rewardId);

  const alreadyClaimed = account.claimedRewards.some(
    (c) => c.eventId === command.eventId && c.rewardId === command.rewardId,
  );
  if (alreadyClaimed) throw new RewardAlreadyClaimedError(command.rewardId);

  const newCurrency = addCurrency(account.run.currency, reward.currencyGrant);
  const newLifetime = addCurrency(account.meta.totalLifetimeEarnings, reward.currencyGrant);

  const updated: PlayerAccount = {
    ...account,
    run: {
      ...account.run,
      currency: newCurrency,
    },
    meta: {
      ...account.meta,
      totalLifetimeEarnings: newLifetime,
    },
    claimedRewards: [
      ...account.claimedRewards,
      {
        eventId: event.id,
        rewardId: reward.id,
        claimedAt: now,
      },
    ],
    processedIdempotencyKeys: [
      ...account.processedIdempotencyKeys.slice(-99),
      command.idempotencyKey,
    ],
    version: account.version + 1,
    updatedAt: now,
  };

  await playerRepo.save(updated);

  return {
    playerId: account.playerId,
    rewardId: reward.id,
    granted: reward.currencyGrant,
    version: updated.version,
  };
}
