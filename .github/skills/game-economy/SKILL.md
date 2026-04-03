# Skill: Game Economy

## Overview

NumberGoUp's economy uses **integer-only arithmetic** throughout to prevent floating-point drift in persistent values.

## Core formula

```
offlineEarnings = sum(generators) * elapsedSeconds * effectiveMultiplier
effectiveMultiplier = (1000 + boostMultiplierSum + permanentMultiplierScaled) / 1000
```

All intermediate values use `bigint`. Multipliers are stored scaled ×1000.

## Multiplier composition

| Source         | Storage                                        | Example                    |
| -------------- | ---------------------------------------------- | -------------------------- |
| Generator base | `multiplierScaled` on Generator                | `1000` = 1×                |
| Upgrade bonus  | `multiplierBonusScaled` on Upgrade             | `500` = +0.5×              |
| Timed boost    | `multiplierScaled` on TimedBoost               | `1000` = +1×               |
| Prestige bonus | `permanentMultiplierScaled` on MetaProgression | `100` = +0.1× per prestige |

## Offline earnings cap

Maximum offline accumulation: **8 hours** (`MAX_OFFLINE_SECONDS = 28800`).
This prevents abuse and caps storage of unbounded values.

## Prestige

- Minimum lifetime earnings required: **1,000,000 currency units**.
- Each prestige adds `+100` to `permanentMultiplierScaled` (= +0.1×).
- Run state (currency, generators, upgrades) is reset.
- Meta progression is preserved.

## Key functions

| Function                  | Location                                        |
| ------------------------- | ----------------------------------------------- |
| `computeOfflineEarnings`  | `packages/domain/src/EconomyService.ts`         |
| `applyMetaMultiplier`     | `packages/domain/src/EconomyService.ts`         |
| `applyCurrencyMultiplier` | `packages/domain/src/valueObjects/Currency.ts`  |
| `computePrestigeBonus`    | `packages/domain/src/models/MetaProgression.ts` |

## Invariants

1. Currency is never negative.
2. Multipliers are never negative.
3. All economy values persist as TEXT decimal strings in PostgreSQL.
4. Economy functions are pure – no side effects.
