# NumberGoUp – GitHub Copilot Instructions

## Project overview

NumberGoUp is a **serverless-first backend** for an idle/incremental tycoon game on Azure.
It is a TypeScript monorepo using Node.js, Azure Container Apps, PostgreSQL, and Azure Service Bus.

## Architecture layers (clean architecture)

```
packages/domain       ← Pure domain models, value objects, economy logic. No I/O.
packages/application  ← Command handlers, ports (interfaces). Depends on domain only.
packages/infrastructure ← Concrete adapters (PostgreSQL repos, Service Bus). Depends on app+domain.
apps/api              ← Thin HTTP handlers (Fastify). Depends on application layer.
apps/worker           ← Service Bus message consumer. Depends on application layer.
apps/orchestrator     ← Durable Functions for timers/orchestrations.
packages/contracts    ← Shared DTO types. No logic.
infra/bicep           ← Azure IaC modules.
```

## Non-negotiable rules

1. **Never trust client time.** Server always computes elapsed time from `lastTickAt` stored in DB.
2. **Never use floating-point for currency.** All economy values are `bigint` persisted as TEXT strings.
3. **Command handlers are idempotent.** Every mutating command accepts an `idempotencyKey` (UUID). Duplicate keys must be silently re-returned.
4. **Keep business rules out of controllers.** API handlers call application-layer command handlers only.
5. **Optimistic concurrency.** Every player state update checks `WHERE version = expected` and throws `ConcurrencyError` if stale.

## Currency representation

- `bigint` in TypeScript at runtime.
- TEXT (decimal string) in PostgreSQL.
- Integer strings in JSON API responses (e.g. `"currency": "1500"`).
- Multipliers are stored scaled ×1000 (e.g. `1500` = 1.5×).

## Key types

- `PlayerAccount` – root aggregate (domain model).
- `RunState` – per-run mutable state (resets on prestige).
- `MetaProgression` – permanent bonuses that survive prestige.
- Domain errors live in `packages/domain/src/errors/DomainErrors.ts`.

## Testing

- Run `npm test` from the root to run all tests.
- Unit tests live next to source (`src/__tests__/`).
- Tests use vitest. Do NOT use Jest.
- Mock repositories using `vi.fn()`. Never use real DB in unit tests.
- Inject a `Clock` interface for deterministic time. Never call `new Date()` directly in handlers.

## CI/CD

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Build: `npm run build`
- Test: `npm run test`

## Style

- TypeScript strict mode.
- Single quotes, trailing commas, 100-char line width (see `.prettierrc`).
- Prefer explicit types over `any`.
- No `console.log` in library code – use the Fastify logger or pass a logger.

## Azure patterns

- Use managed identity for all service-to-service auth (no connection strings in code).
- Key Vault for secrets in production.
- All timestamps UTC using `TIMESTAMPTZ` in PostgreSQL.
- Service Bus messages include `idempotencyKey` and `type` fields.
