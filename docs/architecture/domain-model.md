# Domain Model

## PlayerAccount

Root aggregate. Wraps all player state.

| Field                      | Type                      | Description                  |
| -------------------------- | ------------------------- | ---------------------------- |
| `playerId`                 | `PlayerId` (string brand) | Unique player identifier     |
| `run`                      | `RunState`                | Mutable per-run state        |
| `meta`                     | `MetaProgression`         | Permanent progression        |
| `claimedRewards`           | `RewardClaim[]`           | Immutable claim ledger       |
| `processedIdempotencyKeys` | `string[]`                | Last 100 processed keys      |
| `version`                  | `number`                  | Optimistic concurrency token |

## RunState

Resets on prestige.

| Field          | Type           | Description                                      |
| -------------- | -------------- | ------------------------------------------------ |
| `currency`     | `bigint`       | Current balance                                  |
| `generators`   | `Generator[]`  | Currency-producing machines                      |
| `upgrades`     | `Upgrade[]`    | Purchasable improvements                         |
| `automations`  | `Automation[]` | Automated generator management                   |
| `activeBoosts` | `TimedBoost[]` | Temporary multipliers                            |
| `lastTickAt`   | `Date`         | Server-side UTC timestamp of last processed tick |

## Generator

| Field              | Type          | Description                             |
| ------------------ | ------------- | --------------------------------------- |
| `id`               | `GeneratorId` | Unique identifier                       |
| `name`             | `string`      | Display name                            |
| `level`            | `number`      | Current level (resets to 1 on prestige) |
| `baseOutput`       | `bigint`      | Base currency output per second         |
| `multiplierScaled` | `bigint`      | Effective multiplier scaled ×1000       |

Output per second = `baseOutput * multiplierScaled / 1000`

## Upgrade

| Field                   | Type           | Description                                  |
| ----------------------- | -------------- | -------------------------------------------- |
| `id`                    | `UpgradeId`    | Unique identifier                            |
| `cost`                  | `bigint`       | Purchase cost                                |
| `purchased`             | `boolean`      | Whether purchased (resets on prestige)       |
| `targetGeneratorId`     | `GeneratorId?` | Generator this upgrade affects               |
| `multiplierBonusScaled` | `bigint`       | Multiplier bonus applied to target generator |

## MetaProgression

Survives prestige resets.

| Field                       | Type     | Description                           |
| --------------------------- | -------- | ------------------------------------- |
| `prestigeCount`             | `number` | Number of prestiges performed         |
| `permanentMultiplierScaled` | `bigint` | Cumulative permanent multiplier bonus |
| `totalLifetimeEarnings`     | `bigint` | All-time earnings across all runs     |

## TimedBoost

| Field              | Type     | Description                            |
| ------------------ | -------- | -------------------------------------- |
| `id`               | `string` | Unique identifier                      |
| `multiplierScaled` | `bigint` | Additive multiplier bonus scaled ×1000 |
| `expiresAt`        | `Date`   | UTC expiry timestamp                   |

## LiveEvent

| Field      | Type            | Description       |
| ---------- | --------------- | ----------------- |
| `id`       | `EventId`       | Unique identifier |
| `startsAt` | `Date`          | UTC start time    |
| `endsAt`   | `Date`          | UTC end time      |
| `rewards`  | `EventReward[]` | Claimable rewards |

## RewardClaim

Append-only ledger entry. Prevents double-claiming.

| Field       | Type       | Description         |
| ----------- | ---------- | ------------------- |
| `eventId`   | `EventId`  | Event reference     |
| `rewardId`  | `RewardId` | Reward reference    |
| `claimedAt` | `Date`     | UTC claim timestamp |

## ID branding

All ID types are branded strings to prevent accidental mixing:

```typescript
type PlayerId = string & { readonly __brand: 'PlayerId' };
type GeneratorId = string & { readonly __brand: 'GeneratorId' };
// etc.
```

Use `asPlayerId()`, `asGeneratorId()` etc. to create branded IDs.
