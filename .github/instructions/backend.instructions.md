---
applyTo: 'apps/**,packages/**'
---

# Backend instructions

## Architecture rules

- **Domain layer** (`packages/domain`): pure functions and types only. Zero I/O, zero framework imports.
- **Application layer** (`packages/application`): command handlers and port interfaces. Depends on domain only.
- **Infrastructure layer** (`packages/infrastructure`): implements ports. Only place for DB/bus code.
- **App layer** (`apps/api`, `apps/worker`): thin adapters. Wire dependencies, delegate to application layer.

## Economy / currency

- Use `bigint` for all currency values at runtime.
- Persist as TEXT decimal strings. Never `NUMERIC` or `FLOAT`.
- Multipliers are integers scaled ×1000 (1000 = 1×, 1500 = 1.5×).
- `applyCurrencyMultiplier(amount, scaled)` → `(amount * scaled) / 1000n`.
- All offline earnings are computed server-side using `computeOfflineEarnings()` from `EconomyService.ts`.

## Command handler conventions

Every command handler must:

1. Load player from `PlayerRepository`.
2. Check idempotency key – return early if already processed.
3. Validate domain rules (throw domain errors if invalid).
4. Compute new state.
5. Increment `version` by 1.
6. Append idempotency key to `processedIdempotencyKeys` (keep last 100).
7. Call `repo.save(updated)` with the new state.
8. Return a typed result object.

## Error handling

- Throw typed errors from `DomainErrors.ts` for all business rule violations.
- Never throw generic `Error` from domain or application code.
- API/worker layers translate `DomainError` to appropriate HTTP/dead-letter responses.

## Timestamps

- All timestamps: `Date` in TypeScript, `TIMESTAMPTZ` in PostgreSQL.
- Always set `updatedAt = clock.now()` on every account mutation.
- Never use `new Date()` directly – inject the `Clock` port.

## Idempotency

- `idempotencyKey` is a UUID supplied by the client.
- Duplicate keys are NOT errors – return the current state silently.
- Keys are stored in `player_idempotency_keys` table.
