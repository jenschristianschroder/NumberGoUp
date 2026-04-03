# ADR-0002: State Storage – PostgreSQL

## Status

Accepted

## Context

Player state requires:

- Strong consistency and ACID transactions (currency and inventory changes)
- Optimistic concurrency for high-throughput updates
- Efficient JSON storage for semi-structured data (generators, upgrades arrays)
- UUID and string primary keys
- UTC timestamp support

## Decision

Use **Azure Database for PostgreSQL Flexible Server** as the primary datastore.

## Consequences

**Positive:**

- Full ACID support – safe for currency mutations.
- JSONB columns for generator/upgrade arrays (flexible schema, indexed if needed).
- Native `TIMESTAMPTZ` for UTC-correct timestamp storage.
- Familiar SQL for most engineers.
- Azure Flexible Server supports managed identity authentication.
- Open-source – portable to other clouds or self-hosted.

**Negative:**

- Requires connection pooling for high-concurrency workloads (PgBouncer or built-in pooling).
- Schema migrations require a migration runner (not included in scaffold – use `psql`, `flyway`, or `node-pg-migrate`).
- Not serverless – minimum cost even at zero load (use Burstable tier for dev).

## Schema decisions

- Currency stored as `TEXT` (decimal string), not `NUMERIC`, to guarantee exact integer representation.
- JSONB for `generators`, `upgrades`, `automations`, `active_boosts` – avoids complex normalisation for arrays that are always read/written together.
- Separate `player_idempotency_keys` table with pruning to last 100 entries per player.
