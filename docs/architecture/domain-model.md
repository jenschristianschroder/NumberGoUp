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

| Field                       | Type            | Description                           |
| --------------------------- | --------------- | ------------------------------------- |
| `prestigeCount`             | `number`        | Number of prestiges performed         |
| `permanentMultiplierScaled` | `bigint`        | Cumulative permanent multiplier bonus |
| `totalLifetimeEarnings`     | `bigint`        | All-time earnings across all runs     |
| `research`                  | `ResearchState` | Permanent research progression        |

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

Use `asPlayerId()`, `asGeneratorId()`, `asResearchNodeId()` etc. to create branded IDs.

## ResearchState

Permanent research progression. Survives prestige resets.

| Field             | Type               | Description                         |
| ----------------- | ------------------ | ----------------------------------- |
| `playerId`        | `PlayerId`         | Owner reference                     |
| `researchPoints`  | `bigint`           | Spendable research currency balance |
| `unlockedNodeIds` | `ResearchNodeId[]` | Research nodes the player unlocked  |

**Research Tier** is derived at read-time: count of unlocked milestone nodes.

## ResearchNode

A node in the research tree. Defined per-theme in `researchNodes`.

| Field           | Type               | Description                                    |
| --------------- | ------------------ | ---------------------------------------------- |
| `id`            | `ResearchNodeId`   | Unique identifier                              |
| `name`          | `string`           | Display name                                   |
| `description`   | `string`           | Flavor text                                    |
| `cost`          | `bigint`           | Research points required to unlock             |
| `prerequisites` | `ResearchNodeId[]` | Nodes that must be unlocked first              |
| `effects`       | `ResearchEffect[]` | Bonuses granted when unlocked                  |
| `branch`        | `string`           | UI grouping (e.g. `economy`, `prestige`)       |
| `isMilestone`   | `boolean`          | Whether this node counts towards Research Tier |

## ResearchEffect

| Field   | Type                 | Description                                  |
| ------- | -------------------- | -------------------------------------------- |
| `type`  | `ResearchEffectType` | Kind of bonus (see below)                    |
| `value` | `bigint`             | Numeric value; interpretation varies by type |

Effect types:

- `generator_multiplier` – additive bonus to all generator output (scaled ×1000)
- `prestige_multiplier` – additive bonus to prestige rewards (scaled ×1000)
- `offline_max_seconds` – extra seconds added to offline earnings cap
- `automation_slots` – additional automation slots
- `boost_effectiveness` – additive bonus to timed-boost multipliers (scaled ×1000)

## GameTheme

Content blueprint for initializing a game. See [Theme System](./theme-system.md) for full details.

| Field                       | Type                     | Description                            |
| --------------------------- | ------------------------ | -------------------------------------- |
| `id`                        | `string`                 | Unique theme identifier                |
| `name`                      | `string`                 | Display name                           |
| `description`               | `string`                 | Flavor text                            |
| `generators`                | `GeneratorTemplate[]`    | Starting generator definitions         |
| `upgrades`                  | `UpgradeTemplate[]`      | Available upgrades                     |
| `initialCurrency`           | `Currency`               | Starting currency for a new run        |
| `prestigeThreshold`         | `Currency`               | Minimum lifetime earnings to prestige  |
| `maxOfflineSeconds`         | `number`                 | Maximum offline earnings cap (seconds) |
| `researchNodes`             | `ResearchNodeTemplate[]` | Research tree node definitions         |
| `researchPointsPerPrestige` | `Currency`               | Research points awarded per prestige   |
