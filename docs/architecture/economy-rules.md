# Economy Rules

## Currency representation

All currency values are stored and computed as integers to avoid floating-point drift.

| Layer | Type |
|-------|------|
| TypeScript runtime | `bigint` |
| PostgreSQL | `TEXT` (decimal string) |
| JSON API responses | `string` (e.g. `"currency": "1500"`) |

**Never use `number` or `float` for currency calculations.**

## Multipliers

Multipliers are stored as integers scaled ×1000:

| Scaled value | Effective multiplier |
|-------------|---------------------|
| `1000` | 1× (no change) |
| `1500` | 1.5× |
| `2000` | 2× |
| `500` | 0.5× |

The scaling formula: `result = (amount * scaledMultiplier) / 1000n`

Example:
```
amount = 1000n
multiplierScaled = 1500n  (= 1.5×)
result = (1000n * 1500n) / 1000n = 1500n
```

## Generator output

```
outputPerSecond = baseOutput * multiplierScaled / 1000
```

The `multiplierScaled` starts at `1000` and increases as upgrades are purchased.

## Offline earnings

Offline earnings are computed server-side when the player next interacts.

```
rawElapsed = now - run.lastTickAt  (server time, never client time)
elapsedSeconds = min(rawElapsed, MAX_OFFLINE_SECONDS)  // capped at 8 hours

boostMultiplier = sum(activeBoosts where expiresAt > now) multiplierScaled
effectiveMultiplier = 1000 + boostMultiplier

for each generator:
  earned += (generator.baseOutput * generator.multiplierScaled / 1000) 
            * elapsedSeconds
            * effectiveMultiplier / 1000

finalEarned = earned * (1000 + permanentMultiplierScaled) / 1000
```

### Cap rationale

The 8-hour cap (`MAX_OFFLINE_SECONDS = 28800`) prevents:
- Unbounded accumulation if a player is offline for weeks
- Exploitation of time-manipulation

## Prestige

Requirements:
- `totalLifetimeEarnings >= 1_000_000`

Effect:
- Resets: `currency = 0`, generators to base, upgrades un-purchased
- Preserves: `MetaProgression`, `totalLifetimeEarnings`, `claimedRewards`
- Grants: `+100` to `permanentMultiplierScaled` per prestige

Permanent multiplier compound effect after N prestiges:
```
permanentMultiplierScaled = N * 100
effectiveBonus = permanentMultiplierScaled / 1000 = N * 0.1
```

E.g. 5 prestiges → 1.5× permanent multiplier on all earnings.

## Upgrade application

When an upgrade is purchased:
1. Deduct `upgrade.cost` from `run.currency`
2. Mark `upgrade.purchased = true`
3. If `targetGeneratorId` is set: add `upgrade.multiplierBonusScaled` to that generator's `multiplierScaled`

## Timed boosts

Boosts are additive. Multiple active boosts stack:
```
totalBoostScaled = sum(b.multiplierScaled for b in activeBoosts where b.expiresAt > now)
```

Expired boosts are ignored; they are not removed from the array immediately.

## Assumptions and trade-offs

- Integer arithmetic truncates at each division step – this is intentional and matches BigInt semantics.
- Offline earnings are computed once at claim time; if a player does not claim, old earnings accumulate to the cap.
- There is no real-time simulation; this is a tick-on-interaction model.
