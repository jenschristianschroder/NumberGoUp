# Theme System

## Overview

The theme system provides a content blueprint for initializing new player accounts. A **theme** defines the generators, upgrades, economy constants, and flavor text for a particular game experience. The core game mechanics are completely theme-agnostic — a theme simply supplies the data.

## Architecture

```
Domain Layer (packages/domain)
├── models/GameTheme.ts     ← Type definitions (GameTheme, GeneratorTemplate, UpgradeTemplate)
├── themes/
│   ├── generic.ts          ← The built-in generic test theme
│   └── index.ts            ← Theme registry (findThemeById, listThemes)
└── createRunStateFromTheme ← Factory function to build RunState from a theme

Application Layer (packages/application)
├── ports/ThemeRepository.ts     ← Read-only port interface
└── commands/CreateAccount.ts    ← Command handler for account creation

Infrastructure Layer (packages/infrastructure)
└── memory/InMemoryThemeRepository.ts  ← In-memory implementation backed by the theme registry

API Layer (apps/api)
├── POST /players          ← Create a new account from a theme
├── GET /themes            ← List available themes (summaries)
└── GET /themes/:themeId   ← Get full theme details
```

## Types

### `GameTheme`

The top-level theme definition.

| Field              | Type                  | Description                                                    |
| ------------------ | --------------------- | -------------------------------------------------------------- |
| `id`               | `string`              | Unique theme identifier (e.g. `"generic"`)                     |
| `name`             | `string`              | Display name                                                   |
| `description`      | `string`              | Flavor text                                                    |
| `generators`       | `GeneratorTemplate[]` | Starting generator definitions                                 |
| `upgrades`         | `UpgradeTemplate[]`   | Available upgrades                                             |
| `initialCurrency`  | `Currency` (bigint)   | Starting currency for a new run                                |
| `prestigeThreshold`| `Currency` (bigint)   | Minimum lifetime earnings to prestige                          |
| `maxOfflineSeconds`| `number`              | Maximum seconds of offline earnings to compute                 |

### `GeneratorTemplate`

Blueprint for a generator. Generators created from a template always start at level 1.

| Field              | Type          | Description                              |
| ------------------ | ------------- | ---------------------------------------- |
| `id`               | `GeneratorId` | Unique identifier                        |
| `name`             | `string`      | Display name                             |
| `baseOutput`       | `Currency`    | Base output per second                   |
| `multiplierScaled` | `bigint`      | Starting multiplier scaled ×1000         |

### `UpgradeTemplate`

Blueprint for an upgrade. Upgrades created from a template always start as unpurchased.

| Field                   | Type           | Description                                  |
| ----------------------- | -------------- | -------------------------------------------- |
| `id`                    | `UpgradeId`    | Unique identifier                            |
| `name`                  | `string`       | Display name                                 |
| `description`           | `string`       | Flavor text                                  |
| `cost`                  | `Currency`     | Purchase cost                                |
| `targetGeneratorId`     | `GeneratorId?` | Generator this upgrade affects               |
| `multiplierBonusScaled` | `bigint`       | Multiplier bonus applied to target generator |

## Generic Theme

The built-in `generic` theme provides neutral/abstract content for testing:

### Generators

| ID           | Name             | Base Output | Multiplier |
| ------------ | ---------------- | ----------- | ---------- |
| `gen-small`  | Small Generator  | 1/s         | 1×         |
| `gen-medium` | Medium Generator | 5/s         | 1×         |
| `gen-large`  | Large Generator  | 25/s        | 1×         |
| `gen-mega`   | Mega Generator   | 100/s       | 1×         |

### Upgrades

| ID                      | Name            | Cost   | Target       | Bonus  |
| ----------------------- | --------------- | ------ | ------------ | ------ |
| `upgrade-efficiency-1`  | Efficiency I    | 100    | gen-small    | +0.5×  |
| `upgrade-efficiency-2`  | Efficiency II   | 500    | gen-medium   | +0.5×  |
| `upgrade-efficiency-3`  | Efficiency III  | 2,500  | gen-large    | +0.5×  |
| `upgrade-efficiency-4`  | Efficiency IV   | 10,000 | gen-mega     | +0.5×  |
| `upgrade-global-boost`  | Global Boost    | 50,000 | (none)       | +1.0×  |

### Constants

| Setting            | Value       |
| ------------------ | ----------- |
| Initial currency   | 100         |
| Prestige threshold | 1,000,000   |
| Max offline seconds| 28,800 (8h) |

## Creating a New Theme

1. Create a new file in `packages/domain/src/themes/`, e.g., `pirate.ts`.
2. Export a `GameTheme` object with the desired content.
3. Register it in `packages/domain/src/themes/index.ts` by adding it to the `themes` array.

Example:

```typescript
import type { GameTheme } from '../models/GameTheme.js';
import { asGeneratorId, asUpgradeId } from '../valueObjects/Identifiers.js';

export const pirateTheme: GameTheme = {
  id: 'pirate',
  name: 'Pirate',
  description: 'Sail the seas and plunder treasure!',
  generators: [
    {
      id: asGeneratorId('gen-rowboat'),
      name: 'Rowboat',
      baseOutput: 1n,
      multiplierScaled: 1000n,
    },
    // ...
  ],
  upgrades: [
    // ...
  ],
  initialCurrency: 50n,
  prestigeThreshold: 500_000n,
  maxOfflineSeconds: 4 * 60 * 60,
};
```

## API Endpoints

### Create Account

`POST /players`

```json
{
  "playerId": "player-abc",
  "themeId": "generic",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

Response (201): Full `PlayerStateDto` wrapped in `ApiResponse`.

Error codes: `THEME_NOT_FOUND` (404), `PLAYER_ALREADY_EXISTS` (409).

### List Themes

`GET /themes`

Response (200): Array of `ThemeSummaryDto` (id, name, description).

### Get Theme

`GET /themes/:themeId`

Response (200): Full `ThemeDto` with generators, upgrades, and economy constants.

Error codes: `THEME_NOT_FOUND` (404).

## Configurable Constants

The `prestigeThreshold` and `maxOfflineSeconds` values in the theme are passed through to the economy service functions. The original hardcoded constants (`PRESTIGE_MINIMUM_LIFETIME_EARNINGS`, `MAX_OFFLINE_SECONDS`) remain as defaults for backward compatibility but can be overridden per theme.
