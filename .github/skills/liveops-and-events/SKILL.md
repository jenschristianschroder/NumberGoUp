# Skill: Live Ops and Events

## Overview

NumberGoUp supports time-boxed live events with claimable rewards. Events are server-authoritative: the server validates event timing, not the client.

## LiveEvent model

```typescript
interface LiveEvent {
  id: EventId;
  name: string;
  startsAt: Date; // UTC
  endsAt: Date; // UTC
  rewards: EventReward[];
}
```

Events are loaded from config/blob storage (read-only at runtime).

## Claiming rewards

1. Client calls `POST /players/:playerId/rewards/claim`
2. Server checks event is active (`isEventActive(event, now)`) using server time
3. Server checks player has not already claimed this reward (idempotent claim ledger)
4. Server credits `reward.currencyGrant` to player currency
5. Claim is recorded in `player_reward_claims` (append-only, prevents double-claim)

## Orchestrated reward distribution

Use `apps/orchestrator/src/ScheduledRewardOrchestrator.ts` for bulk reward distribution:

1. HTTP trigger starts `ScheduledRewardOrchestrator` with event end time
2. Orchestrator waits via durable timer until event ends
3. Fans out to `EnqueueRewardClaim` activity for each eligible player
4. Each activity enqueues a `claim-event-reward` Service Bus message

## TimedBoost

A `TimedBoost` applies a temporary multiplier (stored scaled ×1000) until `expiresAt`.
Boosts are additive with other boosts and base multiplier.
Expired boosts are ignored in `computeOfflineEarnings`.

## Adding a new event type

1. Extend `LiveEvent` if new fields are needed.
2. Update the event config loader in `apps/api/src/config/repositories.ts`.
3. Add an orchestrator variant in `apps/orchestrator/src/` if orchestration is needed.
4. Document the event in `docs/architecture/domain-model.md`.
