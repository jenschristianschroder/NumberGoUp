# Architecture Overview

## System overview

NumberGoUp is a serverless-first backend for an idle tycoon game. It uses a clean architecture pattern with clear separation between domain, application, and infrastructure concerns.

```
Client (mobile/web)
        │
        ▼
  ┌─────────────┐
  │  API App    │  Azure Container Apps – stateless, auto-scaled
  │  (Fastify)  │
  └──────┬──────┘
         │ HTTP/REST
         ▼
  ┌─────────────┐        ┌──────────────────┐
  │ Application │◄──────►│   PostgreSQL     │  Player state, idempotency,
  │   Layer     │        │   (Flexible)     │  reward claims
  └──────┬──────┘        └──────────────────┘
         │
  ┌──────▼──────┐
  │  Domain     │  Pure business logic – no I/O
  └─────────────┘

  ┌─────────────────────────────────────────────────┐
  │  Service Bus  ──►  Worker App                   │
  │  (player-commands queue)  │                     │
  │                     (same Application+Domain)   │
  └─────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────┐
  │  Durable Functions (Orchestrator)               │
  │  - Scheduled reward distribution                │
  │  - Timed event orchestration                    │
  └─────────────────────────────────────────────────┘
```

## Layers

### Domain (`packages/domain`)

- Pure TypeScript types and functions.
- No I/O, no framework dependencies.
- Models: `PlayerAccount`, `RunState`, `Generator`, `Upgrade`, `Automation`, `MetaProgression`, `TimedBoost`, `LiveEvent`, `RewardClaim`.
- Economy logic: `EconomyService.ts` with `computeOfflineEarnings`, `applyMetaMultiplier`.
- Value objects: `Currency` (bigint), typed ID brands.
- Domain errors with stable codes.

### Application (`packages/application`)

- Command handlers (use cases).
- Port interfaces (`PlayerRepository`, `LiveEventRepository`, `Clock`).
- Depends only on domain.

### Infrastructure (`packages/infrastructure`)

- Implements application ports.
- `PostgresPlayerRepository` – full player state CRUD with optimistic concurrency.
- SQL migrations in `src/postgres/migrations/`.

### API (`apps/api`)

- Fastify HTTP server.
- Thin route handlers: validate input (Zod) → call command handler → map to DTO → return.
- No business logic in routes.

### Worker (`apps/worker`)

- Consumes Service Bus messages from `player-commands` queue.
- `MessageProcessor` routes messages to command handlers.
- Dead-letters on domain errors; abandons on transient errors.

### Orchestrator (`apps/orchestrator`)

- Durable Functions for stateful workflows.
- `ScheduledRewardOrchestrator`: waits for event end, fans out reward claims.

## Key design principles

1. **Server-authoritative time**: elapsed time is always computed server-side.
2. **Integer economy**: all currency as `bigint`, persisted as TEXT.
3. **Idempotency**: every write command carries a UUID idempotency key.
4. **Optimistic concurrency**: player state updates use version checks.
5. **Replay safety**: all command handlers are safe to replay.

## Known gaps (initial scaffold)

- Authentication/authorisation not yet implemented.
- Live event config loader is a stub; needs blob storage implementation.
- No rate limiting on the API.
- Observability (OpenTelemetry) wiring is not yet added.
- No database migration runner (use `psql -f` or a migration tool like `db-migrate`).
- Orchestrator `EnqueueRewardClaim` activity is a stub; needs real Service Bus publish.

## Recommended next steps

1. Add auth middleware (e.g. validate Azure AD / game token).
2. Implement live event config loading from Azure Blob Storage.
3. Add OpenTelemetry tracing to API and worker.
4. Implement a DB migration runner in CI.
5. Add integration tests with a real PostgreSQL instance.
6. Wire Application Insights connection string.
