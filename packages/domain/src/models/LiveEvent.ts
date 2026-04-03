import type { EventId, RewardId } from '../valueObjects/Identifiers.js';
import type { Currency } from '../valueObjects/Currency.js';

/**
 * LiveEvent – a time-boxed event with claimable rewards.
 */
export interface LiveEvent {
  id: EventId;
  name: string;
  startsAt: Date;
  endsAt: Date;
  rewards: EventReward[];
}

export interface EventReward {
  id: RewardId;
  name: string;
  currencyGrant: Currency;
}

export function isEventActive(event: LiveEvent, now: Date): boolean {
  return now >= event.startsAt && now <= event.endsAt;
}

/**
 * RewardClaim – a record that a player has claimed a specific reward.
 * Used for idempotency: once claimed, cannot be claimed again.
 */
export interface RewardClaim {
  eventId: EventId;
  rewardId: RewardId;
  claimedAt: Date;
}
