# API Boundaries

## Base URL

`https://{environment}.{domain}/` (injected at deployment time via Container App URL)

## Authentication

> **Note**: Authentication is not yet implemented. Endpoints are currently open. Add bearer token validation as a Fastify middleware before shipping.

## Common response shapes

### Success

```json
{
  "data": { ... },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error

```json
{
  "code": "INSUFFICIENT_FUNDS",
  "message": "Not enough currency to complete the purchase.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Validation error

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [ ... ],
  "requestId": "..."
}
```

## Endpoints

### Health check

`GET /health`

Response: `{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }`

### Create account

`POST /players`

Request body:

```json
{
  "playerId": "player-abc",
  "themeId": "generic",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

Response (201): `PlayerStateDto` wrapped in `ApiResponse`

Error codes: `THEME_NOT_FOUND`, `PLAYER_ALREADY_EXISTS`

### List themes

`GET /themes`

Response: Array of `ThemeSummaryDto` (`id`, `name`, `description`)

### Get theme

`GET /themes/:themeId`

Response: `ThemeDto` with generators, upgrades, and economy constants

Error codes: `THEME_NOT_FOUND`

### Get player state

`GET /players/:playerId`

Response: `PlayerStateDto` (see `packages/contracts/src/index.ts`)

| Field         | Type                 | Notes             |
| ------------- | -------------------- | ----------------- |
| `currency`    | `string`             | Integer string    |
| `generators`  | `GeneratorDto[]`     |                   |
| `upgrades`    | `UpgradeDto[]`       |                   |
| `automations` | `AutomationDto[]`    |                   |
| `meta`        | `MetaProgressionDto` |                   |
| `lastTickAt`  | `string`             | ISO-8601 UTC      |
| `version`     | `number`             | Concurrency token |

### Buy upgrade

`POST /players/:playerId/upgrades/buy`

Request body:

```json
{
  "upgradeId": "upgrade-speed-1",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

Response: `BuyUpgradeResponse`

Error codes: `PLAYER_NOT_FOUND`, `UPGRADE_NOT_FOUND`, `UPGRADE_ALREADY_PURCHASED`, `INSUFFICIENT_FUNDS`

### Claim offline earnings

`POST /players/:playerId/offline-earnings/claim`

Request body:

```json
{ "idempotencyKey": "..." }
```

Response: `ClaimOfflineEarningsResponse`

### Prestige

`POST /players/:playerId/prestige`

Request body:

```json
{ "idempotencyKey": "..." }
```

Response: `PrestigeResponse`

Error codes: `PRESTIGE_THRESHOLD_NOT_MET`

### Assign automation

`POST /players/:playerId/automations/assign`

Request body:

```json
{
  "generatorId": "gen-1",
  "idempotencyKey": "..."
}
```

### Claim event reward

`POST /players/:playerId/rewards/claim`

Request body:

```json
{
  "eventId": "event-spring-2024",
  "rewardId": "reward-daily-1",
  "idempotencyKey": "..."
}
```

Error codes: `EVENT_NOT_FOUND`, `EVENT_EXPIRED`, `REWARD_NOT_FOUND`, `REWARD_ALREADY_CLAIMED`

## Idempotency

All state-changing commands require an `idempotencyKey` (UUID). Duplicate keys return the current state without re-processing. This allows clients to safely retry on network failure.

## HTTP status codes

| Code | Meaning                                                             |
| ---- | ------------------------------------------------------------------- |
| 200  | Success                                                             |
| 201  | Created (new account)                                               |
| 400  | Validation error                                                    |
| 404  | Resource not found (player, theme, upgrade, event, reward)          |
| 409  | Conflict (duplicate, concurrency, already purchased/exists)         |
| 422  | Business rule violation (insufficient funds, etc.)                  |
| 500  | Unexpected server error                                             |
